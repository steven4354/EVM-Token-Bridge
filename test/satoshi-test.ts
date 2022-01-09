import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RouterRopsten } from "typechain/RouterRopsten";
import { SatoshiToken } from "typechain/SatoshiToken";

describe("SatoshiToken ERC20 Contract", function () {
    let routerropsten: RouterRopsten;
    let satoshitoken : SatoshiToken;
    
    const amountToMint = 200;
    const amountToBridge = 3;

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    let signers : SignerWithAddress[];
 
    beforeEach(async () => {

      signers = await ethers.getSigners();

      const ropstenFactory = await ethers.getContractFactory('RouterRopsten', signers[0]);
      routerropsten = await ropstenFactory.deploy();
      await routerropsten.deployed();

      const satoshiFactory = await ethers.getContractFactory('SatoshiToken', signers[0]);
      satoshitoken = await satoshiFactory.deploy();
      await satoshitoken.deployed();

    });

    describe('mint', async () => {
      it("Should mint user amounToMint tokens into their balance", async function () {
        await expect(satoshitoken.mint(signers[0].address, amountToMint))
          .to.emit(satoshitoken, "Transfer")
          .withArgs(zeroAddress, signers[0].address, amountToMint);
          const balance = await satoshitoken.balanceOf(signers[0].address);
          const totalSupply = await satoshitoken.totalSupply();
          expect(balance).to.eq(amountToMint);
          expect(totalSupply).to.eq(amountToMint);
      })
    })

    describe('approve', async () => {
      it("Should approve Router contract to spend user funds", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerropsten.address, amountToBridge);
          const allowance = await satoshitoken.allowance(signers[0].address, routerropsten.address);
          expect(allowance).to.eq(amountToBridge);
      })
    })
});
