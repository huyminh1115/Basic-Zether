import { getAddress, getBytes, concat } from "ethers";
import { Account, parseEther, WalletClient } from "viem";
import { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import { BasicZether$Type } from "../artifacts/contracts/BasicZether.sol/BasicZether";
import {
  BabyJubAccount,
  generateBabyJubAccount,
  convertToBabyJubPoints,
  formatPoint,
  createTransferInput,
  readBalanceWithOnchainData,
  randomBabyJubScalar,
  SolidityPointInput,
  generateBurnProof,
  flattenProof,
  generateCalldata,
  convertSolidityPointToArrayString,
  calculatePublicKeyHash,
  generateTransferProof,
  convertToBabyJubPointsArrayString,
  schnorrChallenge,
  randomScalar,
} from "./ultis";

// Use the generated contract type from artifacts
type MyZSCContract = GetContractReturnType<BasicZether$Type["abi"]>;

type PublicClient = {
  getBlockNumber: () => Promise<bigint>;
};

function toUnitsByDecimals(
  amount: string | number | bigint,
  decimals: number
): bigint {
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "number") {
    const s = amount.toString();
    return toUnitsByDecimals(s, decimals);
  }
  const [intPart, fracPartRaw = ""] = amount.split(".");
  const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  const normalized = `${intPart}${fracPart}`.replace(/^0+/, "");
  return BigInt(normalized === "" ? "0" : normalized);
}

class Client {
  account: BabyJubAccount;
  MAX: bigint;

  constructor(MAX: bigint, account?: BabyJubAccount) {
    try {
      // Noop: placeholder for optional event listeners (kept for compatibility)
    } catch (error: any) {
      console.log(
        "Event listener setup skipped for Ethers.js compatibility:",
        error?.message
      );
    }

    this.account = account ?? generateBabyJubAccount();
    this.MAX = MAX;
  }

  get privateKey(): bigint {
    return this.account.privateKey;
  }

  get publicKey(): SolidityPointInput {
    return this.account.publicKey;
  }

  async fund(BasicZether: MyZSCContract, account: Account, amount: string) {
    const valueWei = parseEther(String(amount));
    return BasicZether.write.fund([this.publicKey], {
      value: valueWei,
      account,
    });
  }

  async burn(
    BasicZether: MyZSCContract,
    publicClient: PublicClient,
    account: Account,
    amount: string
  ) {
    const accountData = await this.stimulateAccount(BasicZether, publicClient);
    const cur_b = readBalanceWithOnchainData(accountData, this.privateKey);
    const counter = await BasicZether.read.counter([
      calculatePublicKeyHash(this.publicKey) as `0x${string}`,
    ]);

    if (!cur_b) {
      throw new Error("Current balance is undefined");
    }

    const proof = await generateBurnProof({
      y: convertSolidityPointToArrayString(this.publicKey), // public
      sk: this.privateKey.toString(),
      CL: convertSolidityPointToArrayString(accountData[0]), // public
      CR: convertSolidityPointToArrayString(accountData[1]), // public
      b: amount, // public
      cur_b: cur_b.toString(),
      counter: counter.toString(), // public
    });
    const calldata = await generateCalldata(proof.proof, proof.publicSignals);

    const proofFlat = flattenProof(calldata.pA, calldata.pB, calldata.pC);

    const res = await BasicZether.write.burn(
      [this.publicKey, BigInt(amount), proofFlat],
      {
        account,
      }
    );
    return { res, calldata };
  }

  async transfer(
    BasicZether: MyZSCContract,
    publicClient: PublicClient,
    account: Account,
    amount: string,
    receiverPublicKey: SolidityPointInput
  ) {
    const accountData = await this.stimulateAccount(BasicZether, publicClient);
    const cur_b = readBalanceWithOnchainData(accountData, this.privateKey);
    const counter = await BasicZether.read.counter([
      calculatePublicKeyHash(this.publicKey) as `0x${string}`,
    ]);
    const MAX = await BasicZether.read.MAX();

    if (!cur_b) {
      throw new Error("Current balance is undefined");
    }

    const r = randomBabyJubScalar(true);

    const [C_send, C_receive, D] = createTransferInput(
      convertToBabyJubPoints(this.publicKey),
      convertToBabyJubPoints(receiverPublicKey),
      BigInt(amount),
      r
    );

    const remainAmount = cur_b - Number(amount);

    const proof = await generateTransferProof({
      // private
      sk: this.privateKey.toString(),
      r: r.toString(),
      sAmount: amount.toString(),
      bRem: remainAmount.toString(),
      // public
      MAX: MAX.toString(),
      CS: convertToBabyJubPointsArrayString(C_send),
      D: convertToBabyJubPointsArrayString(D),
      CRe: convertToBabyJubPointsArrayString(C_receive),
      y: convertSolidityPointToArrayString(this.publicKey), // public
      yR: convertSolidityPointToArrayString(receiverPublicKey), // public
      CL: convertSolidityPointToArrayString(accountData[0]), // public
      CR: convertSolidityPointToArrayString(accountData[1]), // public
      counter: counter.toString(), // public
    });
    const calldata = await generateCalldata(proof.proof, proof.publicSignals);
    const proofFlat = flattenProof(calldata.pA, calldata.pB, calldata.pC);

    return BasicZether.write.transfer(
      [
        this.publicKey,
        receiverPublicKey,
        formatPoint(C_send),
        formatPoint(C_receive),
        formatPoint(D),
        proofFlat,
      ],
      {
        account,
      }
    );
  }

  async stimulateAccount(
    BasicZether: MyZSCContract,
    publicClient: PublicClient
  ) {
    const [epochLength, blockNumber] = await Promise.all([
      BasicZether.read.epochLength(),
      publicClient.getBlockNumber(),
    ]);
    const epoch = blockNumber / epochLength;

    const accounts = await BasicZether.read.simulateAccounts([
      [this.publicKey],
      epoch,
    ]);
    const accountData = accounts[0];
    return accountData;
  }

  async rollOver(BasicZether: MyZSCContract) {
    return BasicZether.write.rollOver([this.publicKey]);
  }

  // current balance for current epoch
  async getCurrentBalance(
    BasicZether: MyZSCContract,
    publicClient: PublicClient
  ): Promise<number | undefined> {
    const accountData = await this.stimulateAccount(BasicZether, publicClient);
    return readBalanceWithOnchainData(accountData, this.privateKey);
  }

  async lock(
    BasicZether: MyZSCContract,
    account: Account,
    lockAddress: string
  ) {
    const y = this.publicKey;
    lockAddress = getAddress(lockAddress);

    const _contractAddress = getAddress(BasicZether.address);
    const _lockAddress = getAddress(lockAddress);
    const { c, s } = schnorrChallenge(
      _contractAddress,
      _lockAddress,
      y,
      this.privateKey
    );

    return BasicZether.write.lock(
      [this.publicKey, lockAddress as `0x${string}`, c, s],
      {
        account,
      }
    );
  }

  async unlock(BasicZether: MyZSCContract, account: Account) {
    return BasicZether.write.unlock([this.publicKey], {
      account,
    });
  }
}

export default Client;
