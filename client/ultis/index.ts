import { ethers } from "ethers";
import {
  buildPoseidon,
  buildBabyjub,
  buildEddsa,
  buildMimc7,
  buildMimcSponge,
  buildPedersenHash,
  buildPoseidonOpt,
  buildPoseidonReference,
  buildSMT,
  newMemEmptyTrie,
  BabyJub,
  Eddsa,
  Mimc7,
  MimcSponge,
  PedersenHash,
  Poseidon,
  Point,
} from "circomlibjs";
import BN from "bn.js";
export * from "./jubjub-util";

/**
 * Zether BabyJub Utilities
 *
 * This module provides utilities for working with BabyJub elliptic curve operations
 * in the context of Zether privacy-preserving transactions.
 *
 * POINT FORMAT STANDARDIZATION:
 * All points in this module use a standardized object format: {x: bigint, y: bigint}
 * - x and y are both bigint values for consistency with Solidity
 * - This matches the SolidityPointInput interface used throughout the codebase
 *
 * This format is used for:
 * - SolidityPointInput type: {x: bigint, y: bigint}
 * - Public keys in accounts
 * - All point operations and conversions
 * - Direct compatibility with Solidity contract parameters
 */

// Type definitions for better type safety
// Standardized point format: {x: bigint, y: bigint} for consistency with Solidity
export interface SolidityPointInput {
  x: bigint;
  y: bigint;
}

export interface BabyJubAccount {
  privateKey: bigint;
  publicKey: SolidityPointInput;
}

export interface ZKInputData {
  sk: string;
  y: SolidityPointInput;
  b: number;
  CL: SolidityPointInput;
  CR: SolidityPointInput;
}

export interface PendingData {
  CL: SolidityPointInput;
  CR: SolidityPointInput;
}

// Global variables for BabyJub operations
let F: any, r: bigint, G: Point, babyjub: BabyJub;

/**
 * Initialize BabyJub utilities
 * Call this before using any other functions
 */
export async function initializeBabyJub() {
  babyjub = await buildBabyjub();
  F = babyjub.F;
  r = babyjub.subOrder;
  G = babyjub.Base8;

  return { F, r, G, babyjub };
}

/**
 * Generate a random scalar for cryptographic operations
 * @returns {bigint} Random scalar as BN instance
 */
export function randomScalar(): bigint {
  const bytes = ethers.randomBytes(32);
  const hexString =
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return BigInt(hexString);
}

/**
 * Generate a BabyJub account with private key, public key, and unique ID
 * @returns {BabyJubAccount} Account object with privateKey, publicKey, and id
 */
export function generateBabyJubAccount(privateKey?: string): BabyJubAccount {
  if (!F || !r || !G || !babyjub) {
    throw new Error("BabyJub not initialized. Call initializeBabyJub() first.");
  }

  // Generate random scalar
  let sk: bigint;
  if (privateKey) {
    sk = BigInt(privateKey);
  } else {
    do {
      const bytes = ethers.randomBytes(32);
      const hexString =
        "0x" +
        Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      sk = BigInt(hexString) % r;
    } while (sk === 0n);
  }

  // Calculate public key
  const pk = babyjub.mulPointEscalar(G, sk);
  // Get public key as SolidityPointInput format {x: bigint, y: bigint}
  const publicKey: SolidityPointInput = {
    x: BigInt(F.toObject(pk[0]).toString()),
    y: BigInt(F.toObject(pk[1]).toString()),
  };

  return {
    privateKey: sk,
    publicKey: publicKey,
  };
}

// This function is no longer needed since we use SolidityPointInput directly

/**
 * Calculate public key hash for contract operations
 * @param {SolidityPointInput} publicKey - Public key object with {x, y} coordinates
 * @returns {string} Keccak256 hash of the public key
 */
export function calculatePublicKeyHash(publicKey: SolidityPointInput): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [publicKey.x.toString(), publicKey.y.toString()]
    )
  );
}

/**
 * Convert a BabyJub point from contract format to circomlib field elements
 * @param {SolidityPointInput} point - BabyJub point object with {x, y} coordinates
 * @returns {Point} Point with field elements for circomlib operations
 */
export function convertToBabyJubPoints(point: SolidityPointInput): Point {
  if (!F) {
    throw new Error("BabyJub not initialized. Call initializeBabyJub() first.");
  }

  return [
    F.e(point.x.toString()), // Convert to field element
    F.e(point.y.toString()),
  ];
}

export function convertToBabyJubPointsArrayString(
  point: Point
): [string, string] {
  return [F.toString(point[0]), F.toString(point[1])];
}

/**
 * Convert a BabyJub point [Fx, Fy] into readable {x, y} bigint format
 * Accepts points in circomlib array form where each coordinate is a field element
 * @param {Point} pointArray - Point array with field elements
 * @returns {SolidityPointInput} Formatted point coordinates
 */
export function formatPoint(pointArray: Point): SolidityPointInput {
  if (!F) {
    throw new Error("BabyJub not initialized. Call initializeBabyJub() first.");
  }
  // pointArray is expected as [F.e(x), F.e(y)]
  return {
    x: BigInt(F.toObject(pointArray[0]).toString()),
    y: BigInt(F.toObject(pointArray[1]).toString()),
  };
}

/**
 * Format account data for zero-knowledge proof input
 * @param {BabyJubAccount} account - Account object with privateKey and publicKey (in SolidityPointInput format)
 * @param {number} balance - Account balance
 * @param {PendingData} pendingData - Pending data with CL and CR points (in SolidityPointInput format)
 * @returns {ZKInputData} Formatted input data for ZK circuits
 */
export function formatZKInput(
  account: BabyJubAccount,
  balance: number,
  pendingData: PendingData
): ZKInputData {
  if (!F) {
    throw new Error("BabyJub not initialized. Call initializeBabyJub() first.");
  }

  const sk = account.privateKey;
  const y = account.publicKey; // Already in SolidityPointInput format {x, y}
  const b: number = balance;

  // Convert pendingData to BabyJub points
  const CL = convertToBabyJubPoints(pendingData.CL);
  const CR = convertToBabyJubPoints(pendingData.CR);

  // Format output as JSON comment block
  const inputData: ZKInputData = {
    sk: sk.toString(), // Convert BigInt to string
    y: y, // y is already in SolidityPointInput format
    b: b,
    CL: {
      x: BigInt(F.toString(CL[0])),
      y: BigInt(F.toString(CL[1])),
    },
    CR: {
      x: BigInt(F.toString(CR[0])),
      y: BigInt(F.toString(CR[1])),
    },
  };

  return inputData;
}

/**
 * Log formatted input data for zero-knowledge proof circuits
 * @param {ZKInputData} inputData - Formatted input data
 */
export function logZKInput(inputData: ZKInputData): void {
  console.log("/* INPUT = " + JSON.stringify(inputData, null, 4) + " */");
}

/**
 * Generate multiple test accounts
 * @param {number} count - Number of accounts to generate
 * @returns {BabyJubAccount[]} Array of account objects
 */
export function generateTestAccounts(count: number): BabyJubAccount[] {
  const accounts: BabyJubAccount[] = [];
  for (let i = 0; i < count; i++) {
    accounts.push(generateBabyJubAccount());
  }
  return accounts;
}

/**
 * Validate if a point is on the BabyJub curve
 * @param {Point} point - Point with x and y coordinates (array [x,y] or object {x,y})
 * @returns {boolean} True if point is on curve
 */
export function isPointOnCurve(point: Point): boolean {
  if (!babyjub) {
    throw new Error("BabyJub not initialized. Call initializeBabyJub() first.");
  }
  // Pass field elements directly; inCurve works with F elements
  return babyjub.inCurve(point);
}

/**
 * Check if two points are equal
 * @param {Point} a - First point in field element format [Fx, Fy]
 * @param {Point} b - Second point in field element format [Fx, Fy]
 * @returns {boolean} True if points are equal
 */
export function eqPoints(a: Point, b: Point): boolean {
  // Both are array format with field elements
  return F.eq(a[0], b[0]) && F.eq(a[1], b[1]);
}

/**
 * Subtract two points (a - b)
 * @param {Point} a - First point in field element format [Fx, Fy]
 * @param {Point} b - Second point in field element format [Fx, Fy]
 * @returns {Point} Result of point subtraction in field element format
 */
export function subTwoPoint(a: Point, b: Point): Point {
  const inverseB = inversePoint(b);
  return babyjub.addPoint(a, inverseB);
}

export function addTwoPoint(a: Point, b: Point): Point {
  return babyjub.addPoint(a, b);
}

/**
 * Calculate the inverse of a point
 * @param {Point} point - Point to invert in field element format [Fx, Fy]
 * @returns {Point} Inverse point in field element format
 */
export function inversePoint(point: Point): Point {
  return [F.neg(point[0]), point[1]];
}

/**
 * Read balance from commitment points using private key
 * @param {Point} CL - Left commitment point in field element format [Fx, Fy]
 * @param {Point} CR - Right commitment point in field element format [Fx, Fy]
 * @param {bigint} sk - Private key
 * @returns {number | undefined} Balance or undefined if not found
 */
export function readBalance(
  CL: Point,
  CR: Point,
  sk: bigint,
  MAX?: bigint
): number | undefined {
  const minusCR = inversePoint(CR);
  const minus_CR_X = babyjub.mulPointEscalar(minusCR, sk);
  const gB = babyjub.addPoint(CL, minus_CR_X);

  // Start from the identity (0, 1) on twisted Edwards
  let acc: Point = [F.e("0"), F.e("1")]; // equivalent babyjub.mulPointEscalar(G, 0);

  for (let i = 0; i < babyjub.subOrder; i++) {
    if (MAX && i >= MAX) return undefined;
    if (eqPoints(acc, gB)) return i;
    acc = babyjub.addPoint(acc, G);
  }

  // Not found within bound
  return undefined;
}

export function readBalanceWithOnchainData(
  accountData: readonly [SolidityPointInput, SolidityPointInput],
  sk: bigint,
  MAX?: bigint
): number | undefined {
  const CL = convertToBabyJubPoints(accountData[0]);
  const CR = convertToBabyJubPoints(accountData[1]);
  return readBalance(CL, CR, sk, MAX);
}

/**
 * Create transfer commitment points (CL, CR)
 * @param {Point} pk - Public key point (array [x,y] or object {x,y})
 * @param {bigint} amount - Transfer amount
 * @param {bigint} r - Random scalar
 * @returns {Point} Commitment point for transfer in field element format [Fx, Fy]
 */
export function createTransferInput(
  senderPubKey: Point,
  receiverPubKey: Point,
  amount: bigint,
  r: bigint
): [Point, Point, Point] {
  const senderPk_r = babyjub.mulPointEscalar(senderPubKey, r);
  const receiverPk_r = babyjub.mulPointEscalar(receiverPubKey, r);
  const g_amount = babyjub.mulPointEscalar(G, amount);
  return [
    babyjub.addPoint(senderPk_r, g_amount),
    babyjub.addPoint(receiverPk_r, g_amount),
    createD(r),
  ];
}

/**
 * Create point D for transfer operations
 * @param {bigint} r - Random scalar
 * @returns {Point} Point D in field element format [Fx, Fy]
 */
export function createD(r: bigint): Point {
  return babyjub.mulPointEscalar(G, r);
}

// Export getter functions for global variables
export const getF = (): any => F;
export const getR = (): bigint => r;
export const getG = (): Point => G;
export const getBabyjub = (): BabyJub => babyjub;
// BabyJubJub prime-order subgroup size (ℓ)
export const BABYJUB_SUBGROUP_ORDER =
  2736030358979909402780800718157159386076813972158567259200215660948447373041n;

/**
 * Return a uniformly random scalar for BabyJubJub.
 * By default: 1 <= scalar <= ℓ-1 (excludeZero = true).
 * Set excludeZero = false to allow 0 <= scalar <= ℓ-1.
 */
export function randomBabyJubScalar(excludeZero: boolean = true): bigint {
  return randomBigIntBelow(BABYJUB_SUBGROUP_ORDER, excludeZero);
}

export function convertSolidityPointToArrayString(
  point: SolidityPointInput
): [string, string] {
  return [point.x.toString(), point.y.toString()];
}

/** -------- internals -------- */

function randomBigIntBelow(n: bigint, excludeZero: boolean): bigint {
  if (n <= 1n) throw new Error("n must be > 1");
  const byteLen = Math.ceil(Number(bitLength(n)) / 8);

  // Rejection sampling to avoid modulo bias
  while (true) {
    const r = bytesToBigInt(getRandomBytes(byteLen));
    const max = 1n << BigInt(byteLen * 8);
    const limit = max - (max % n); // largest unbiased ceiling
    if (r < limit) {
      const x = r % n;
      if (!excludeZero || x !== 0n) return x === 0n ? 1n : x; // ensure [1..n-1]
    }
  }
}

function bitLength(n: bigint): number {
  let bits = 0;
  let x = n - 1n;
  while (x > 0n) {
    x >>= 1n;
    bits++;
  }
  return Math.max(bits, 1);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let x = 0n;
  for (const b of bytes) x = (x << 8n) + BigInt(b);
  return x;
}

function getRandomBytes(len: number): Uint8Array {
  // Browser (Web Crypto)
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    const buf = new Uint8Array(len);
    g.crypto.getRandomValues(buf);
    return buf;
  }
  // Node.js
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomBytes } = require("crypto");
  return randomBytes(len);
}

// Solidity ABI-compatible hash: keccak256(abi.encode(address, (x,y), (x,y)))
export function schnorrChallenge(
  contractAddress: string,
  lockAddress: string,
  y: SolidityPointInput,
  sk: bigint
): { c: bigint; s: bigint } {
  const r = randomScalar();
  const Rpt = babyjub.mulPointEscalar(G, r);
  const R = formatPoint(Rpt);

  const abi = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abi.encode(
    [
      "address",
      "address",
      "tuple(uint256 x,uint256 y)",
      "tuple(uint256 x,uint256 y)",
    ],
    [contractAddress, lockAddress, [y.x, y.y], [R.x, R.y]]
  );
  const c = BigInt(ethers.keccak256(encoded)) % BABYJUB_SUBGROUP_ORDER;

  const s = (r + BigInt(c) * sk) % BABYJUB_SUBGROUP_ORDER;
  return { c: BigInt(c), s };
}
