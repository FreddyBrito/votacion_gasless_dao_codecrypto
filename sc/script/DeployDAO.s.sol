// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";
import {DAOVoting} from "../src/DAOVoting.sol";

contract DeployDAO is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 securityPeriod = 1 hours;

        vm.startBroadcast(deployerPrivateKey);

        MinimalForwarder forwarder = new MinimalForwarder("MinimalForwarder");
        DAOVoting dao = new DAOVoting(address(forwarder), securityPeriod);

        vm.stopBroadcast();

        console.log("MinimalForwarder deployed at:", address(forwarder));
        console.log("DAOVoting deployed at:", address(dao));
    }
}
