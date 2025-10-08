## Basic Zether

This project demonstrates privacy-preserving token accounting (Zether) on BabyJub with Circom proofs.

- The implementation is based on this paper: https://eprint.iacr.org/2019/191.pdf (page 13)
- Solidity contracts: `contracts/BasicZether.sol`, `contracts/BabyJub.sol`, `contracts/Verifier/Verifier.sol`
- Circom circuits and proving artifacts: `circom/`
- TypeScript client helpers: `client/`
- Hardhat tests: `test/`

### Quickstart

1. Install dependencies

```bash
npm install
```

2. Compile contracts

```bash
npx hardhat compile
```

3. Run tests

```bash
npx hardhat test
```

Optional: start a local node

```bash
npx hardhat node
```

### Requirements

- Node.js 18+
- npm (or pnpm/yarn)
- For circuit work: `circom` and `snarkjs` (see `circom/README`)

### How it works (high-level)

- Epoch-based accounting: pending changes are applied when the next epoch starts (`epochLength` blocks).
- ZK transfers/burns: Circom proofs attest to valid balance updates without revealing amounts.
- Access control: accounts can be locked to an EOA; unlocking removes the restriction.

Key parameters

- `DECIMALS`: on-chain precision (e.g., 4)
- `MAX`: total supply cap `2^32 - 1`

### Circom workflow

Pre-built artifacts for transfer/burn are included under `circom/`. To rebuild or modify circuits, follow the `circom/README` and accompanying `Makefile`:

```bash
# inside ./circom
make compile name=circom-file-name
make power power=power name=circom-file-name
make solidity name=circom-file-name
make witness name=circom-file-name   # requires inputs/<name>_input.json
make proof name=circom-file-name
make verify
```

If you regenerate the solidity verifier, ensure `contracts/Verifier/Verifier.sol` reflects the latest output.

### Project structure

- `contracts/` — Solidity sources
- `circom/` — circuits, proving/verifying keys, wasm, Makefile
- `client/` — helper utilities for proofs and contract calls
- `test/` — Hardhat tests for fund/transfer/burn/lock-unlock and epochs

### Common tasks

```bash
# Compile contracts
npx hardhat compile

# Run tests with gas report / coverage (if configured)
npx hardhat test

# Start local node
npx hardhat node
```

### Testing notes

- After funding, balances move from `pending` → `acc` at the next epoch.
- Transfers debit the sender immediately; the receiver is credited after the next epoch.
- Burns schedule balance reduction that applies after the next epoch.
- Locking restricts who can initiate actions for a Zether public key; unlocking removes it.

### Troubleshooting

- Reinstall deps if TypeScript types are missing:

```bash
rm -rf node_modules package-lock.json && npm install
```

- If circuit files change, rebuild artifacts in `circom/`, then recompile contracts.
- Ensure Node.js 18+ and recent `hardhat`.
