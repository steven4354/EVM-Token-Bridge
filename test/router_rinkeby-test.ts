import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {RouterRinkeby} from "typechain/RouterRinkeby";
import { SatoshiToken } from "typechain/SatoshiToken";

describe("RouterRinkeby Contract", function () {
    let routerrinkeby: RouterRinkeby;
    let satoshitoken : SatoshiToken;
    
    const amountToMint = 200;
    const amountToBridge = 3;
    const amountToClaim = amountToBridge;

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const options = {value: ethers.utils.parseEther("0.001")};

    let signers : SignerWithAddress[];
 
    beforeEach(async () => {

      signers = await ethers.getSigners();

      const ropstenFactory = await ethers.getContractFactory('RouterRinkeby', signers[0]);
      routerrinkeby = await ropstenFactory.deploy();
      await routerrinkeby.deployed();

      const satoshiFactory = await ethers.getContractFactory('SatoshiToken', signers[0]);
      satoshitoken = await satoshiFactory.deploy();
      await satoshitoken.deployed();

    });

    describe('lock ERC20 tokens', async () => {
      it("Should lock user`s tokens in RouterContract", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerrinkeby.address, amountToBridge);
          await expect(routerrinkeby.lockTokens(amountToBridge, satoshitoken.address, options))
          .to.emit(satoshitoken, "Transfer").withArgs(signers[0].address, routerrinkeby.address, amountToBridge);;
      })
    })

    describe('revert tokens locking with less amount', async () => {
      it("Should revert when trying to use the service with less ether", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerrinkeby.address, amountToBridge);
          const lessAmount = {value: ethers.utils.parseEther("0.0001")};
          expect(routerrinkeby.lockTokens(amountToBridge, satoshitoken.address, lessAmount))
          .to.be.revertedWith("Contract should be paid 0.001 ETH to use the service");
      })
    })

    describe('revert locking 0 amount of tokens', async () => {
      it("Should revert when trying to lock 0 amount of ERC20 tokens", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerrinkeby.address, amountToBridge);
          expect(routerrinkeby.lockTokens(0, satoshitoken.address, options))
          .to.be.revertedWith("Locking non-positive amount of tokens");
      })
    })

    describe('tokensClaimed mapping of contract address', async () => {
      it("Should not update tokensClaimed mapping of contractAddress when one-way bridging", async function () {
          await satoshitoken.mint(signers[0].address, amountToMint);
          await satoshitoken.approve(routerrinkeby.address, amountToBridge);
          await routerrinkeby.lockTokens(amountToBridge, satoshitoken.address, options)
          const tokensClaimed = await routerrinkeby.getTokensClaimedAmount(satoshitoken.address, signers[0].address);
          expect(tokensClaimed).to.eq(0);
      })
    })

    describe('Claim tokens', async () => {
      it("Should claim tokens", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessage = await signers[0].signMessage(arrayifyHash);

        await routerrinkeby.claimTokens(messageHash, signedMessage, satoshitoken.address, amountToClaim);
        const wrappedTokenAddress = await routerrinkeby.getWrappedTokenAddress(satoshitoken.address);
        const wrappedTokensAmount = await routerrinkeby.getTokensClaimedAmount(wrappedTokenAddress, signers[0].address);
        expect(wrappedTokensAmount).to.eq(amountToClaim);
      })
    })

    describe('Revert claiming when signer is changed', async () => {
      it("Should revert claiming transaction when signer is changed", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessageUserZero = await signers[0].signMessage(arrayifyHash);

        await expect(routerrinkeby.connect(signers[1])
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

        await routerrinkeby.claimTokens(messageHash, signedMessage, satoshitoken.address, amountToClaim);
        const wrappedTokenAddress = await routerrinkeby.getWrappedTokenAddress(satoshitoken.address);
        const wrappedTokensAmount = await routerrinkeby.getTokensClaimedAmount(wrappedTokenAddress, signers[0].address);
        
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
          await satoshitoken.approve(routerrinkeby.address, amountToBridge);
          await expect(routerrinkeby.lockTokens(amountToBridge, satoshitoken.address, options))
          .to.emit(satoshitoken, "Transfer").withArgs(signers[0].address, routerrinkeby.address, amountToBridge);

          await expect(routerrinkeby.releaseTokens(satoshitoken.address, amountToBridge))
          .to.emit(satoshitoken, "Approval").withArgs(routerrinkeby.address, signers[0].address,  amountToBridge);

          await expect(satoshitoken.transferFrom(routerrinkeby.address, signers[0].address, amountToBridge))
          .to.emit(satoshitoken, "Transfer").withArgs(routerrinkeby.address, signers[0].address,  amountToBridge);
      })
    })
});
