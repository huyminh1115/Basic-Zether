import { buildBabyjub, buildEddsa, buildPoseidon } from "circomlibjs";
import { BigNumberish } from "ethers";
import { readFileSync } from "fs";
import { Groth16Proof, PublicSignals, groth16 } from "snarkjs";
type PromiseOrValue<T> = T | Promise<T>;

export function makeVerifiedInput(recoveredAddress: string, increment: string) {
  let excludedAddress = recoveredAddress.toLowerCase();
  if (excludedAddress.slice(0, 2) == "0x")
    excludedAddress = excludedAddress.slice(2);
  while (excludedAddress.length < 48) excludedAddress = `0${excludedAddress}`;
  let sIncrement = parseInt(increment).toString(16);
  while (sIncrement.length < 16) sIncrement = `0${sIncrement}`;
  return `${sIncrement}${excludedAddress}`;
}

export function convertUint8ToString(_in: Uint8Array) {
  return Buffer.from(_in).toString("hex");
}

export function convertStringToUint8(_in: string) {
  return Uint8Array.from(Buffer.from(_in, "hex"));
}

export function buffer2bits(buff: Uint8Array) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) res.push(1n);
      else res.push(0n);
    }
  }
  return res;
}

export function convertBigIntsToNumber(
  _in: bigint[],
  _len: number,
  mode: "normal" | "hex" = "normal"
) {
  let result: bigint = BigInt("0");
  let e2 = BigInt("1");
  for (let i = 0; i < _len; i++) {
    result += _in[i] * e2;
    e2 = e2 + e2;
  }
  return mode == "normal" ? result.toString(16) : `0x${result.toString(16)}`;
}

export async function generatePoseidonHash(
  _address: string,
  mode: "normal" | "hex" = "normal"
): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const res2 = poseidon([_address]);
  return mode == "normal"
    ? String(F.toObject(res2))
    : `0x${String(F.toObject(res2).toString(16))}`;
}

// export async function generateWitness(message: string, privateKey: Uint8Array) {
//   const eddsa = await buildEddsa();
//   const babyJub = await buildBabyjub();
//   const messageBytes = Buffer.from(message, "hex");
//   const signature = eddsa.signPedersen(privateKey, messageBytes);
//   const pSignature = eddsa.packSignature(signature);
//   const msgBits = buffer2bits(messageBytes);
//   const r8Bits = buffer2bits(pSignature.slice(0, 32));
//   const sBits = buffer2bits(pSignature.slice(32, 64));
//   const pubKey = eddsa.prv2pub(privateKey);
//   const pPubKey = babyJub.packPoint(pubKey);
//   const aBits = buffer2bits(pPubKey);
//   return { A: aBits, R8: r8Bits, S: sBits, msg: msgBits };
// }

// Define precise input type for burn proof
export interface BurnProofInput extends Record<string, any> {
  // Public inputs (visible in proof)
  y: [string, string]; // Public key coordinates [x, y]
  CL: [string, string]; // Left commitment coordinates [x, y]
  CR: [string, string]; // Right commitment coordinates [x, y]
  b: string; // Burn amount
  cur_b: string; // Current balance
  counter: string; // Counter value
  // Private input (hidden in proof)
  sk: string; // Secret key
}

// Define precise input type for transfer proof
export interface TransferProofInput extends Record<string, any> {
  // Private
  sk: string;
  r: string;
  sAmount: string;
  bRem: string;
  // Public
  MAX: string;
  y: [string, string];
  yR: [string, string];
  CL: [string, string];
  CR: [string, string];
  CS: [string, string];
  D: [string, string];
  CRe: [string, string];
  counter: string;
}

export async function generateBurnProof(input: BurnProofInput): Promise<{
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}> {
  const { proof, publicSignals } = await groth16.fullProve(
    input,
    "./circom/burn_js/burn.wasm",
    "./circom/burn_1.zkey"
  );
  return { proof, publicSignals };
}

export async function generateTransferProof(
  input: TransferProofInput
): Promise<{
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}> {
  const { proof, publicSignals } = await groth16.fullProve(
    input,
    "./circom/transfer_js/transfer.wasm",
    "./circom/transfer_1.zkey"
  );
  return { proof, publicSignals };
}

// export async function verifyProof(
//   proof: Groth16Proof,
//   publicSignals: PublicSignals
// ): Promise<boolean> {
//   const vKey = JSON.parse(
//     readFileSync("./circom/burn_verification_key.json", "utf-8")
//   );
//   const res = await groth16.verify(vKey, publicSignals, proof);
//   return res;
// }

interface ReturnType {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: bigint[];
}
export async function generateCalldata(
  proof: Groth16Proof,
  publicSignals: PublicSignals
): Promise<ReturnType> {
  const _call = await groth16.exportSolidityCallData(proof, publicSignals);
  const realCall = JSON.parse(`[${_call}]`) as [
    ReturnType["pA"],
    ReturnType["pB"],
    ReturnType["pC"],
    ReturnType["pubSignals"]
  ];
  return {
    pA: realCall[0],
    pB: realCall[1],
    pC: realCall[2],
    pubSignals: realCall[3],
  };
}

// Helper to flatten Groth16 (pA, pB, pC) into uint256[8]
export function flattenProof(
  pA: [bigint, bigint],
  pB: [[bigint, bigint], [bigint, bigint]],
  pC: [bigint, bigint]
): readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  return [
    BigInt(pA[0]),
    BigInt(pA[1]),
    BigInt(pB[0][0]),
    BigInt(pB[0][1]),
    BigInt(pB[1][0]),
    BigInt(pB[1][1]),
    BigInt(pC[0]),
    BigInt(pC[1]),
  ] as const;
}
