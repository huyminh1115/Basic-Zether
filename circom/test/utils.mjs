/* eslint-disable no-undef */
import { buildPoseidon, buildBabyjub, buildEddsa } from "circomlibjs";
import crypto from "node:crypto";

export const babyjub = await buildBabyjub();
export const F = babyjub.F; // field helper
export const r = babyjub.subOrder; // prime subgroup order
export const G = babyjub.Base8; // standard prime-subgroup basepoint

// Generate a random scalar sk in [1, r-1]
function randomScalar() {
  let sk;
  do {
    const bytes = crypto.randomBytes(32);
    sk = BigInt("0x" + bytes.toString("hex")) % r;
  } while (sk === 0n);
  return sk;
}

export function generateKeypair() {
  const sk = randomScalar();

  const Y = babyjub.mulPointEscalar(G, sk); // public key point [x,y]

  const keypair = { sk, pk: Y };
  return keypair;
}

export function buffer2bits(buff) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) res.push(1n);
      else res.push(0n);
    }
  }
  return res;
}

export function makeVerifiedInput(recoveredAddress, increment) {
  let excludedAddress = recoveredAddress.toLowerCase();
  if (excludedAddress.slice(0, 2) == "0x")
    excludedAddress = excludedAddress.slice(2);
  while (excludedAddress.length < 48) excludedAddress = `0${excludedAddress}`;
  let sIncrement = parseInt(increment).toString(16);
  while (sIncrement.length < 16) sIncrement = `0${sIncrement}`;
  return `${sIncrement}${excludedAddress}`;
}

export async function generatePoseidonHash(_address, mode = "normal") {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const res2 = poseidon([_address]);
  return mode == "normal"
    ? String(F.toObject(res2))
    : `0x${String(F.toObject(res2).toString(16))}`;
}

export function convertBigIntsToNumber(_in, _len, mode = "normal") {
  let result = BigInt("0");
  let e2 = BigInt("1");
  for (let i = 0; i < _len; i++) {
    result += _in[i] * e2;
    e2 = e2 + e2;
  }
  return mode == "normal" ? result.toString(16) : `0x${result.toString(16)}`;
}

export function bigint_to_Uint8Array(x) {
  var ret = new Uint8Array(32);
  for (var idx = 31; idx >= 0; idx--) {
    ret[idx] = Number(x % 256n);
    x = x / 256n;
  }
  return ret;
}

export function Uint8Array_to_bigint(x) {
  var ret = 0n;
  for (var idx = 0; idx < x.length; idx++) {
    ret = ret * 256n;
    ret = ret + BigInt(x[idx]);
  }
  return ret;
}

export function bigint_to_array(n, k, x) {
  let mod = 1n;
  for (let idx = 0; idx < n; idx++) {
    mod = mod * 2n;
  }

  let ret = [];
  var x_temp = x;
  for (let idx = 0; idx < k; idx++) {
    ret.push(x_temp % mod);
    x_temp = x_temp / mod;
  }
  return ret;
}
