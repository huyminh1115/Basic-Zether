PROJECT_NAME=smart_contract_practice

# colors
GREEN = $(shell tput -Txterm setaf 2)
YELLOW = $(shell tput -Txterm setaf 3)
WHITE = $(shell tput -Txterm setaf 7)
RESET = $(shell tput -Txterm sgr0)
GRAY = $(shell tput -Txterm setaf 6)
TARGET_MAX_CHAR_NUM = 20

## Compile circom. | Run
compile:
	circom circom/$(name).circom --r1cs --wasm --sym -l ../node_modules

## Compute witness with WebAssembly.
witness:
	node $(name)_js/generate_witness.js $(name)_js/$(name).wasm inputs/$(name)_input.json $(name)_witness.wtns

## Provide a power.
power:
	@chmod +x ./shells/power.sh
	@./shells/power.sh $(power) $(name)

## Generate a proof
proof:
	snarkjs groth16 prove $(name)_1.zkey $(name)_witness.wtns $(name)_proof.json $(name)_public.json

## Verify a proof.
verify:
	snarkjs groth16 verify $(name)_verification_key.json $(name)_public.json $(name)_proof.json

## Compile a smart contract.
solidity:
	snarkjs zkey export solidityverifier $(name)_1.zkey $(name).sol

## Generate parameters for smart contract.
## Usage: make generate name=sha256 [c=1] (add c=1 for easy-to-read format)
generate:
	snarkjs zkey export soliditycalldata $(name)_public.json $(name)_proof.json > $(name)_calldata.txt

## Test. | Test and maintain
circom_test:
	npx mocha test/$(name).test.mjs --max-old-space-size=4000

## Clear.
clear:
	rm -rf *_js
	rm -f *.zkey
	rm -f *.r1cs
	rm -f *.ptau
	rm -f *.wtns
	rm -f *.sym
	rm -f *.sol
	rm -f proof.json
	rm -f public.json
	rm -f *verification_key.json

## Shows help. | Help
help:
	@echo ''
	@echo 'Usage:'
	@echo ''
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk '/^[a-zA-Z\-]+:/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
		    if (index(lastLine, "|") != 0) { \
				stage = substr(lastLine, index(lastLine, "|") + 1); \
				printf "\n ${GRAY}%s: \n\n", stage;  \
			} \
			helpCommand = substr($$1, 0, index($$1, ":")-1); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			if (index(lastLine, "|") != 0) { \
				helpMessage = substr(helpMessage, 0, index(helpMessage, "|")-1); \
			} \
			printf "  ${YELLOW}%-$(TARGET_MAX_CHAR_NUM)s${RESET} ${GREEN}%s${RESET}\n", helpCommand, helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
	@echo ''
