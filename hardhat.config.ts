import "@nomiclabs/hardhat-waffle"
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import { task } from "hardhat/config";
import "solidity-coverage"
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname+'/.env' });


task("deployRouterRopsten", "Deploys the contract", async (taskArgs, hre) => {
  const RouterRopsten = await hre.ethers.getContractFactory("RouterRopsten"); 
  const RouterRopstenContract = await RouterRopsten.deploy();
  // tslint:disable: no-console
  console.log('Waiting for RouterRopsten deployment...');
  await RouterRopstenContract.deployed();
  // tslint:disable: no-console
  console.log("RouterRopsten deployed to:", RouterRopstenContract.address);
});

task("deployRouterRinkeby", "Deploys the contract", async (taskArgs, hre) => {
  const RouterRinkeby = await hre.ethers.getContractFactory("RouterRinkeby"); 
  const RouterRinkebyContract = await RouterRinkeby.deploy();
  // tslint:disable: no-console
  console.log('Waiting for RouterRinkeby deployment...');
  await RouterRinkebyContract.deployed();
  // tslint:disable: no-console
  console.log("RouterRinkeby deployed to:", RouterRinkebyContract.address);
});

task("deployERCPermit", "Deploys the contract", async (taskArgs, hre) => {
  const TOTAL_SUPPLY = 21000000;
  const ERCPermit = await hre.ethers.getContractFactory("ERC20Permit"); 
  const ERCPermitContract = await ERCPermit.deploy(TOTAL_SUPPLY);
  // tslint:disable: no-console
  console.log('Waiting for ERC20Permit deployment...');
  await ERCPermitContract.deployed();
  // tslint:disable: no-console
  console.log("ERC20Permit deployed to:", ERCPermitContract.address);
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "localhost",
  solidity: "0.8.4",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.REACT_APP_INFURA_APIKEY_ROPSTEN}`,
      accounts: [`${process.env.REACT_APP_ROPSTEN_PRIVATE_KEY}`]
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.REACT_APP_INFURA_APIKEY_RINKEBY}`, 
      accounts: [`${process.env.REACT_APP_RINKEBY_PRIVATE_KEY}`]
    }
  },
  typechain: {
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    outDir: './typechain',
    target: 'ethers-v5',
  },
};
