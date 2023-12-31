pragma solidity ^0.8.20;

interface IHordTreasury {
    function depositToken(address token, uint256 amount) external;
}
