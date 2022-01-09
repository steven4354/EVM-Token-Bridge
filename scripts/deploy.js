// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const SatoshiToken = await hre.ethers.getContractFactory("SatoshiToken");
  const satoshitoken = await SatoshiToken.deploy();
  await satoshitoken.deployed();

  const WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
  const wrappedtoken = await WrappedToken.deploy();
  await wrappedtoken.deployed();

  const RouterRopsten = await hre.ethers.getContractFactory("RouterRopsten");
  const routerropsten = await RouterRopsten.deploy();
  await routerropsten.deployed();

  const RouterRinkeby = await hre.ethers.getContractFactory("RouterRinkeby");
  const routerrinkeby = await RouterRinkeby.deploy();
  await routerrinkeby.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
