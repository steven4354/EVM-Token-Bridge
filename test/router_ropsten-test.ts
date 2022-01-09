import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RouterRopsten } from "typechain/RouterRopsten";
import { SatoshiToken } from "typechain/SatoshiToken";

describe("RouterRopsten Contract", function () {
    let routerropsten: RouterRopsten;
    let satoshitoken : SatoshiToken;
    
    const amountToMint = 200;
    const amountToBridge = 3;
    const amountToClaim = amountToBridge;

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const options = {value: ethers.utils.parseEther("0.001")};

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

    describe('lock ERC20 tokens', async () => {
      it("Should lock user`s tokens in RouterContract", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerropsten.address, amountToBridge);
          await expect(routerropsten.lockTokens(amountToBridge, satoshitoken.address, options))
          .to.emit(satoshitoken, "Transfer").withArgs(signers[0].address, routerropsten.address, amountToBridge);
      })
    })

    describe('revert tokens locking with less amount', async () => {
      it("Should revert when trying to use the service with less ether", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerropsten.address, amountToBridge);
          const lessAmount = {value: ethers.utils.parseEther("0.0001")};
          expect(routerropsten.lockTokens(amountToBridge, satoshitoken.address, options))
          .to.be.revertedWith("Contract should be paid 0.001 ETH to use the service");
      })
    })

    describe('revert locking 0 amount of tokens', async () => {
      it("Should revert when trying to lock 0 amount of ERC20 tokens", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerropsten.address, amountToBridge);
          expect(routerropsten.lockTokens(0, satoshitoken.address, options))
          .to.be.revertedWith("Locking non-positive amount of tokens");
      })
    })

    describe('tokensClaimed mapping of contract address', async () => {
      it("Should not update tokensClaimed mapping of contractAddress when one-way bridging", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerropsten.address, amountToBridge);
          await routerropsten.lockTokens(amountToBridge, satoshitoken.address, options)
          const tokensClaimed = await routerropsten.getTokensClaimedAmount(satoshitoken.address, signers[0].address);
          expect(tokensClaimed).to.eq(0);
      })
    })

    describe('Claim tokens', async () => {
      it("Should claim tokens", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessage = await signers[0].signMessage(arrayifyHash);

        await routerropsten.claimTokens(messageHash, signedMessage, satoshitoken.address, amountToClaim);
        const wrappedTokenAddress = await routerropsten.getWrappedTokenAddress(satoshitoken.address);
        const wrappedTokensAmount = await routerropsten.getTokensClaimedAmount(wrappedTokenAddress, signers[0].address);
        expect(wrappedTokensAmount).to.eq(amountToClaim);
      })
    })

    describe('Revert claiming when signer is changed', async () => {
      it("Should revert claiming transaction when signer is changed", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessageUserZero = await signers[0].signMessage(arrayifyHash);

        await expect(routerropsten.connect(signers[1])
                                  .claimTokens(messageHash, signedMessageUserZero, satoshitoken.address, amountToClaim))
                                  .to.be.revertedWith("Message sender didn't sign the claim transaction");
      })
    })

    describe('Unwrap tokens', async () => {
      it("Should burn tokens from ERC20 address", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessage = await signers[0].signMessage(arrayifyHash);

        await routerropsten.claimTokens(messageHash, signedMessage, satoshitoken.address, amountToClaim);
        const wrappedTokenAddress = await routerropsten.getWrappedTokenAddress(satoshitoken.address);
        const wrappedTokensAmount = await routerropsten.getTokensClaimedAmount(wrappedTokenAddress, signers[0].address);
        
        const wtkFactory = await ethers.getContractFactory('WrappedToken');
        const wrappedToken = wtkFactory.attach(wrappedTokenAddress);

        await expect(wrappedToken.connect(signers[0])
                                .burn(wrappedTokensAmount))
                                .to.emit(wrappedToken, "Transfer").withArgs(signers[0].address, zeroAddress, wrappedTokensAmount);
      })
    })

    describe('Release ERC20 tokens', async () => {
      it("Should release user`s tokens from RouterContract", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerropsten.address, amountToBridge);
          await expect(routerropsten.lockTokens(amountToBridge, satoshitoken.address, options))
          .to.emit(satoshitoken, "Transfer").withArgs(signers[0].address, routerropsten.address, amountToBridge);

          await expect(routerropsten.releaseTokens(satoshitoken.address, amountToBridge))
          .to.emit(satoshitoken, "Approval").withArgs(routerropsten.address, signers[0].address,  amountToBridge);

          await expect(satoshitoken.transferFrom(routerropsten.address, signers[0].address, amountToBridge))
          .to.emit(satoshitoken, "Transfer").withArgs(routerropsten.address, signers[0].address,  amountToBridge);
      })
    })
});
