import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { PublicClient, TestClient, parseEther } from "viem";
import Client from "../client/Client";
import { initializeBabyJub, generateBabyJubAccount } from "../client/ultis";

describe("Test BasicZether", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  const EPOCH_LENGTH = 20n;
  const DECIMALS = 4;
  const MAX = 4294967295n; // 2^32 - 1

  const client1PrivateKey =
    "989684980841917356420192175194090137718385886803255486827734521826538409888";

  async function increaseToNextEpoch(
    publicClient: PublicClient,
    testClient: TestClient
  ) {
    const blockNumber = await publicClient.getBlockNumber();
    const blockUntilNextEpoch = EPOCH_LENGTH - (blockNumber % EPOCH_LENGTH);

    await testClient.mine({ blocks: Number(blockUntilNextEpoch) });
  }

  before(async function () {
    await initializeBabyJub();
  });

  async function setupAll() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await hre.viem.getWalletClients();

    // Deploy BasicZether contract
    const BasicZether = await hre.viem.deployContract("BasicZether", [
      EPOCH_LENGTH,
      DECIMALS,
    ]);

    // Generate test accounts with proper BabyJub keys
    const zetherAccount1 = generateBabyJubAccount(client1PrivateKey);
    const zetherAccount2 = generateBabyJubAccount();

    const publicClient = await hre.viem.getPublicClient();
    const testClient = await hre.viem.getTestClient();

    return {
      BasicZether,
      accounts,
      zetherAccount1,
      zetherAccount2,
      publicClient,
      testClient,
    };
  }

  describe("BasicZether core flows", function () {
    it("1) Fund one account and check balance after rollover", async function () {
      const {
        BasicZether,
        accounts,
        zetherAccount1,
        publicClient,
        testClient,
      } = await loadFixture(setupAll);

      const client1 = new Client(MAX, zetherAccount1);

      // fund 1 ETH => 10^DECIMALS units
      await client1.fund(BasicZether, accounts[1].account, "1");

      // move to next epoch so pending -> acc
      await increaseToNextEpoch(publicClient, testClient);

      const bal = await client1.getCurrentBalance(BasicZether, publicClient);
      expect(bal).to.equal(10 ** DECIMALS);
    });

    it("2) Fund, transfer to another account, check both balances across epochs", async function () {
      const {
        BasicZether,
        accounts,
        zetherAccount1,
        zetherAccount2,
        publicClient,
        testClient,
      } = await loadFixture(setupAll);

      const client1 = new Client(MAX, zetherAccount1);
      const client2 = new Client(MAX, zetherAccount2);

      // Fund sender with 2 ETH => 2 * 10^DECIMALS
      await client1.fund(BasicZether, accounts[1].account, "2");
      await increaseToNextEpoch(publicClient, testClient);

      const beforeTransferBal1 = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(beforeTransferBal1).to.equal(2 * 10 ** DECIMALS);

      // Transfer 1.0000 unit equivalent => 10^DECIMALS
      await client1.transfer(
        BasicZether,
        publicClient,
        accounts[1].account,
        String(1 * 10 ** DECIMALS),
        client2.publicKey
      );

      // Sender balance decreases immediately
      const afterTransferBal1 = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(afterTransferBal1).to.equal(1 * 10 ** DECIMALS);

      await increaseToNextEpoch(publicClient, testClient);
      const receiverBal = await client2.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(receiverBal).to.equal(1 * 10 ** DECIMALS);
    });

    it("3) Fund, burn some, and check balance decreases after rollover", async function () {
      const {
        BasicZether,
        accounts,
        zetherAccount1,
        publicClient,
        testClient,
      } = await loadFixture(setupAll);

      const client1 = new Client(MAX, zetherAccount1);

      // Fund 2 ETH => 2 * 10^DECIMALS
      await client1.fund(BasicZether, accounts[1].account, "2");
      await increaseToNextEpoch(publicClient, testClient);

      const balBeforeBurn = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(balBeforeBurn).to.equal(2 * 10 ** DECIMALS);

      // Burn 1 * 10^DECIMALS units; balance remains same this epoch
      await client1.burn(
        BasicZether,
        publicClient,
        accounts[1].account,
        String(10 ** DECIMALS)
      );

      const balSameEpoch = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(balSameEpoch).to.equal(2 * 10 ** DECIMALS);

      // After next epoch, burn applies and balance decreases
      await increaseToNextEpoch(publicClient, testClient);
      const balAfterBurn = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(balAfterBurn).to.equal(1 * 10 ** DECIMALS);
    });

    it("4) Fund, lock to EOA, and unauthorized transfer should revert", async function () {
      const {
        BasicZether,
        accounts,
        zetherAccount1,
        zetherAccount2,
        publicClient,
        testClient,
      } = await loadFixture(setupAll);

      const client1 = new Client(MAX, zetherAccount1);
      const client2 = new Client(MAX, zetherAccount2);

      // Fund 2 ETH and rollover to have enough for two transfers
      await client1.fund(BasicZether, accounts[1].account, "2");
      await increaseToNextEpoch(publicClient, testClient);

      // Lock client1 to accounts[1]
      await client1.lock(
        BasicZether,
        accounts[1].account,
        accounts[1].account.address
      );

      // Unauthorized sender (accounts[2]) attempts to transfer -> revert "Not authorized"
      await expect(
        client1.transfer(
          BasicZether,
          publicClient,
          accounts[2].account,
          String(10 ** DECIMALS),
          client2.publicKey
        )
      ).to.be.rejectedWith("Not authorized");

      // Authorized sender (accounts[1]) can transfer successfully while locked
      await client1.transfer(
        BasicZether,
        publicClient,
        accounts[1].account,
        String(1 * 10 ** DECIMALS),
        client2.publicKey
      );

      // Sender decreases immediately to 1 * 10^DECIMALS
      const senderBalAfterAuthorized = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(senderBalAfterAuthorized).to.equal(1 * 10 ** DECIMALS);

      // Unlock and allow any address again
      await client1.unlock(BasicZether, accounts[1].account);

      // Previously unauthorized (accounts[2]) can now transfer successfully
      await client1.transfer(
        BasicZether,
        publicClient,
        accounts[2].account,
        String(1 * 10 ** DECIMALS),
        client2.publicKey
      );

      // Sender decreases immediately to 0 after second transfer
      const senderBalAfterSecond = await client1.getCurrentBalance(
        BasicZether,
        publicClient
      );
      expect(senderBalAfterSecond).to.equal(0);

      await increaseToNextEpoch(publicClient, testClient);
      const receiverBalAfter = await client2.getCurrentBalance(
        BasicZether,
        publicClient
      );
      // Receiver receives both transfers after rollover
      expect(receiverBalAfter).to.equal(2 * 10 ** DECIMALS);
    });

    it("5) Burn transfers correct ETH amount and updates total supply", async function () {
      const {
        BasicZether,
        accounts,
        zetherAccount1,
        publicClient,
        testClient,
      } = await loadFixture(setupAll);

      const client1 = new Client(MAX, zetherAccount1);

      // Fund contract with 2 ETH for this account and roll over
      await client1.fund(BasicZether, accounts[1].account, "2");
      await increaseToNextEpoch(publicClient, testClient);

      // Contract balance before burn should be 2 ETH
      const beforeContractBal = await publicClient.getBalance({
        address: BasicZether.address as `0x${string}`,
      });

      // Total supply before burn
      const totalSupplyBefore = await BasicZether.read.totalSupply();

      // Burn exactly 1 * 10^DECIMALS units -> expects 1 ETH returned
      const burnUnits = String(10 ** DECIMALS);
      await client1.burn(
        BasicZether,
        publicClient,
        accounts[1].account,
        burnUnits
      );

      // Contract balance should reduce by exactly 1 ETH (gas paid by caller, not from contract)
      const afterContractBal = await publicClient.getBalance({
        address: BasicZether.address as `0x${string}`,
      });
      const expectedDelta = parseEther("1");
      expect(beforeContractBal - afterContractBal).to.equal(expectedDelta);

      // Total supply should decrease by burned units
      const totalSupplyAfter = await BasicZether.read.totalSupply();
      expect(totalSupplyBefore - totalSupplyAfter).to.equal(
        BigInt(10 ** DECIMALS)
      );
    });
  });
});
