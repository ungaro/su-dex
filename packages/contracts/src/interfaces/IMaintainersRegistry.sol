pragma solidity ^0.8.20;

interface IMaintainersRegistry {
    function isMaintainer(address _address) external view returns (bool);
}
