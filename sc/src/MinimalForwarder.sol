// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title MinimalForwarder
 * @notice EIP-2771 meta-transaction forwarder.
 *         Users sign typed data off-chain; a relayer submits the signature via {execute}.
 */
contract MinimalForwarder is EIP712, Nonces {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint48  deadline;
        bytes   data;
    }

    bytes32 private constant FORWARD_REQUEST_TYPEHASH =
        keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"
        );

    event ForwardRequestExecuted(address indexed signer, uint256 nonce, bool success);

    error InvalidSignature();
    error ExpiredRequest(uint48 deadline);
    error InvalidSigner(address expected, address recovered);
    error InsufficientValue(uint256 expected, uint256 provided);
    error CallFailed();

    constructor(string memory name) EIP712(name, "1") {}

    function getNonce(address from) public view returns (uint256) {
        return nonces(from);
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        bytes32 digest = _digest(req);
        (address recovered, ECDSA.RecoverError err,) = digest.tryRecover(signature);
        if (err != ECDSA.RecoverError.NoError || recovered != req.from) return false;
        if (req.deadline != 0 && block.timestamp > req.deadline) return false;
        return true;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool success, bytes memory result)
    {
        if (msg.value != req.value) revert InsufficientValue(req.value, msg.value);

        bytes32 digest = _digest(req);
        (address recovered, ECDSA.RecoverError err,) = digest.tryRecover(signature);
        if (err != ECDSA.RecoverError.NoError) revert InvalidSignature();
        if (recovered != req.from) revert InvalidSigner(req.from, recovered);
        if (req.deadline != 0 && block.timestamp > req.deadline) revert ExpiredRequest(req.deadline);

        uint256 currentNonce = _useNonce(req.from);

        bytes memory callData = abi.encodePacked(req.data, req.from);

        uint256 reqGas = req.gas;
        address to     = req.to;
        uint256 value  = req.value;

        assembly ("memory-safe") {
            success := call(reqGas, to, value, add(callData, 0x20), mload(callData), 0, 0)
        }

        result = success ? abi.encode(true) : abi.encode(false);

        if (!success) revert CallFailed();

        emit ForwardRequestExecuted(req.from, currentNonce, success);
    }

    function _digest(ForwardRequest calldata req) internal view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    FORWARD_REQUEST_TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    nonces(req.from),
                    req.deadline,
                    keccak256(req.data)
                )
            )
        );
    }
}
