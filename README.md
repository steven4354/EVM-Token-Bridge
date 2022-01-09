# EVM Token Bridge Simulator

- This version of the project uses ERC20 Permit mechanism to lock the tokens into the source router contract
- The Bridge dApp charges 0.001 ETH fee for using the service

## To run the project
- `npm install`
- `touch .env` -> an .env file with two VARs is needed, as the FE reads the addresses of the routers contracts from there
    - Make two vars: 
        - REACT_APP_ROUTERROPSTEN_ADDRESS
        - REACT_APP_ROUTERRINKEBY_ADDRESS
- The following hardhat tasks need to be run in order to deploy the contracts. Read the `hardhat.config.ts` file for what .env VARs you need (Infura API Keys plus Ropsten And Rinkeby account private keys). You can also skip this step and deploy them using another method. However the Routers` variables need to be populated.
    - `npx hardhat compile`
    - `npx hardhat deployRouterRopsten --network ropsten` then copy address to REACT_APP_ROUTERROPSTEN_ADDRESS
    - `npx hardhat deployRouterRinkeby --network rinkeby` then copy address to REACT_APP_ROUTERRINKEBY_ADDRESS
    - `npx hardhat deployERCPermit --network ropsten` then copy address somewhere, so you can use it later

- `npm run start`

### To Run the Tests
Note: the tests use TypeChain
- `npx hardhat clean`
- `npx hardhat compile`
- `npx hardhat node`
- `npx hardhat test`
- To run the tests with code coverage: `npx hardhat coverage --network hardhat`
