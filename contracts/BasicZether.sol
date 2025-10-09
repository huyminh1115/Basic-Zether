// SPDX-License-Identifier: Apache License 2.0
pragma solidity ^0.8.0;

import "./BabyJub.sol";
import "./Verifier/Verifier.sol";

contract BasicZether {
    using BabyJub for BabyJub.Point;

    uint8 immutable public DECIMALS;
    uint256 constant public MAX = 4294967295; // 2^32 - 1
    address constant LOCK_ADDRESS = 0x0000000000000000000000000000000000000001;
    Verifier public verifier;

    // 0: CL
    // 1: CR
    mapping(bytes32 => BabyJub.Point[2]) public acc; // main account mapping
    mapping(bytes32 => BabyJub.Point[2]) public pending; // storage for pending transfers

    mapping(bytes32 => address) public lockAddresses;
    mapping(bytes32 => uint256) public lastRollOver;
    mapping(bytes32 => uint256) public counter;


    uint256 public epochLength;
    uint256 public lastGlobalUpdate = 0; 
    uint256 public totalSupply;

    constructor(uint256 _epochLength, uint8 _decimals) {
        DECIMALS = _decimals;
        epochLength = _epochLength;

        verifier = new Verifier();
    }

    function registered(bytes32 yHash) public view returns (bool) {
        BabyJub.Point memory zero = BabyJub.Point(0, 0);
        BabyJub.Point[2][2] memory scratch = [acc[yHash], pending[yHash]];
        return !(scratch[0][0].eq(zero) && scratch[0][1].eq(zero) && scratch[1][0].eq(zero) && scratch[1][1].eq(zero));
    }

    function checkLock(bytes32 pubKeyHash, address checkAddress) public view returns (bool) {
        address lockAddress = lockAddresses[pubKeyHash];

        if(lockAddress == address(0)) {
            return true;
        }

        return lockAddress == checkAddress;
    }

    function lock(BabyJub.Point memory y, address lockAddress, uint256 c, uint256 s) public {
        bytes32 yHash = keccak256(abi.encode(y));

        // allows y to participate. c, s should be a Schnorr signature on "this"
        BabyJub.Point memory K = BabyJub.base().mul(s).add(BabyJub.neg(BabyJub.mul(y, c)));
        
        uint256 challenge = uint256(keccak256(abi.encode(address(this), lockAddress, y, K))) % BabyJub.SUBGROUP_ORDER;

        require(challenge == c, "Invalid registration signature!");

        lockAddresses[yHash] = lockAddress;
    }

    function unlock(BabyJub.Point memory y) public {
        bytes32 yHash = keccak256(abi.encode(y));
        require(lockAddresses[yHash] != address(0), "Account is not locked!");
        require(checkLock(yHash, msg.sender), "Not authorized");
        lockAddresses[yHash] = address(0);
    }

    function fund(BabyJub.Point memory publicKey) public  payable {
        uint256 amount = msg.value;
        uint256 mintedAmount = amount * 10 ** DECIMALS / 10 ** 18;
        totalSupply += mintedAmount;
        require(totalSupply <= MAX, "Total supply exceeds maximum");

        bytes32 pubKeyHash = keccak256(abi.encode(publicKey));
        require(checkLock(pubKeyHash, msg.sender), "Not authorized");

    
        if(!registered(pubKeyHash)) {
            // new account
            acc[pubKeyHash][0] = publicKey;
            acc[pubKeyHash][1] = BabyJub.base();

            pending[pubKeyHash][0] = BabyJub.mul(BabyJub.base(), mintedAmount);
            pending[pubKeyHash][1] = BabyJub.id();

            lastRollOver[pubKeyHash] = block.number / epochLength;

        } else {
            _rollOver(pubKeyHash);

            pending[pubKeyHash][0] = BabyJub.add(pending[pubKeyHash][0], BabyJub.mul(BabyJub.base(), mintedAmount));
        }
    }

    function rollOver(BabyJub.Point memory publicKey) public {
        bytes32 pubKeyHash = keccak256(abi.encode(publicKey));
        _rollOver(pubKeyHash);
    }

    function _rollOver(bytes32 yHash) internal {
        uint256 e = block.number / epochLength;

        if (lastRollOver[yHash] < e) {
            BabyJub.Point[2][2] memory scratch = [acc[yHash], pending[yHash]];
            acc[yHash][0] = BabyJub.add(scratch[0][0], scratch[1][0]);
            acc[yHash][1] = BabyJub.add(scratch[0][1], scratch[1][1]);

            pending[yHash][0] = BabyJub.id();
            pending[yHash][1] = BabyJub.id();

            lastRollOver[yHash] = e;
        }
    }

    function transfer(BabyJub.Point memory senderPubKey, BabyJub.Point memory receiverPubKey, BabyJub.Point memory C_send, BabyJub.Point memory C_receive, BabyJub.Point memory D, uint256[8] calldata _proof) public {
        bytes32 senderPubKeyHash = keccak256(abi.encode(senderPubKey));
        bytes32 receiverPubKeyHash = keccak256(abi.encode(receiverPubKey));

        // check sender is registered
        require(registered(senderPubKeyHash), "Sender is not registered");

        // check sender is authorized
        require(checkLock(senderPubKeyHash, msg.sender), "Not authorized");

        // roll over sender
        _rollOver(senderPubKeyHash);

        BabyJub.Point[2] memory currentBalance = acc[senderPubKeyHash];

        if(!registered(receiverPubKeyHash)) {
            acc[receiverPubKeyHash][0] = receiverPubKey;
            acc[receiverPubKeyHash][1] = BabyJub.base();

            pending[receiverPubKeyHash][0] = BabyJub.id();
            pending[receiverPubKeyHash][1] = BabyJub.id();
        } else {
            _rollOver(receiverPubKeyHash);
        }

        uint256[16] memory _pubSignals = [
            senderPubKey.x,
            senderPubKey.y,
            receiverPubKey.x,
            receiverPubKey.y,
            currentBalance[0].x,
            currentBalance[0].y,
            currentBalance[1].x,
            currentBalance[1].y,
            C_send.x,
            C_send.y,
            D.x,
            D.y,
            C_receive.x,
            C_receive.y,
            counter[senderPubKeyHash],
            MAX
        ];

        require(verifier.verifyTransferProof(_proof, _pubSignals), "Transfer proof verification failed!");

        acc[senderPubKeyHash][0] = BabyJub.add(acc[senderPubKeyHash][0], C_send.neg());
        acc[senderPubKeyHash][1] = BabyJub.add(acc[senderPubKeyHash][1], D.neg());

        pending[receiverPubKeyHash][0] = BabyJub.add(pending[receiverPubKeyHash][0], C_receive);
        pending[receiverPubKeyHash][1] = BabyJub.add(pending[receiverPubKeyHash][1], D);

        counter[senderPubKeyHash]++;
    }

    function simulateAccounts(BabyJub.Point[] memory y, uint256 epoch) view public returns (BabyJub.Point[2][] memory accounts) {

        uint256 size = y.length;
        accounts = new BabyJub.Point[2][](size);

        for (uint256 i = 0; i < size; i++) {
            bytes32 pubKeyHash = keccak256(abi.encode(y[i]));
            accounts[i] = acc[pubKeyHash];

            if (lastRollOver[pubKeyHash] < epoch) {

                BabyJub.Point[2] memory pendingData = pending[pubKeyHash];

                accounts[i][0] = BabyJub.add(accounts[i][0], pendingData[0]);
                accounts[i][1] = BabyJub.add(accounts[i][1], pendingData[1]);

            }
        }
    }

     function burn(BabyJub.Point memory y, uint256 bTransfer, uint256[8] calldata _proof) public {        
        bytes32 pubKeyHash = keccak256(abi.encode(y));
        require(registered(pubKeyHash), "Account not yet registered.");
        require(checkLock(pubKeyHash, msg.sender), "Not authorized");

        _rollOver(pubKeyHash);

        // current balance after roll over
        BabyJub.Point[2] memory currentBalance = acc[pubKeyHash];

        require(0 <= bTransfer && bTransfer <= MAX, "Transfer amount out of range.");

        BabyJub.Point[2] memory scratch = pending[pubKeyHash];

        BabyJub.Point memory burnAmount = BabyJub.neg(BabyJub.mul(BabyJub.base(), bTransfer));
        pending[pubKeyHash][0] = BabyJub.add(scratch[0], burnAmount);

        uint256[8] memory _pubSignals = [
            y.x,
            y.y,
            currentBalance[0].x,
            currentBalance[0].y,
            currentBalance[1].x,
            currentBalance[1].y,
            bTransfer,
            counter[pubKeyHash]
        ];

        require(verifier.verifyBurnProof(_proof, _pubSignals), "Burn proof verification failed!");

        // transfer eth to msg.sender
        uint256 transferAmount = bTransfer * 10 ** 18 / 10 ** DECIMALS;
        payable(msg.sender).transfer(transferAmount);

        counter[pubKeyHash]++;

        totalSupply -= bTransfer;
    }
}
