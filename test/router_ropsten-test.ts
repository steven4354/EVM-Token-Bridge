import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RouterRopsten } from "typechain/RouterRopsten";
import { ERC20Permit } from "typechain/ERC20Permit";

import permit from "./permit_test";

describe("RouterRopsten Contract", function () {
    let routerropsten: RouterRopsten;
    let ercpermit : ERC20Permit;
    
    const chainId = 31337; // Note: should be the same in hardhat config
    const ERC20_PERMIT_TOTAL_SUPPLY = 21000000; // 21M
    const amountToBridge = 10;
    const amountToClaim = amountToBridge;

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const options = {value: ethers.utils.parseEther("0.001")};

    let signers : SignerWithAddress[];

    beforeEach(async () => {

      signers = await ethers.getSigners();

      const ropstenFactory = await ethers.getContractFactory('RouterRopsten', signers[0]);
      routerropsten = await ropstenFactory.deploy();
      await routerropsten.deployed();

      const ercPermitFactory = await ethers.getContractFactory('ERC20Permit', signers[0]);
      ercpermit = await ercPermitFactory.deploy(ERC20_PERMIT_TOTAL_SUPPLY);
      await ercpermit.deployed();

    });

    describe('lock ERC20 tokens', async () => {
      it("Should lock user`s tokens in RouterContract", async function () {
          const deadline = + new Date() + 60 * 60;
          const nonce = await ercpermit.nonces(signers[0].address);
          const name = await ercpermit.name();
          const permitSig = await permit(chainId, nonce.toNumber(), name, ercpermit.address, signers[0], routerropsten.address, amountToBridge, deadline);
          await expect(routerropsten.connect(signers[0]).lockTokens(amountToBridge, ercpermit.address, deadline, permitSig.v, permitSig.r, permitSig.s, options))
          .to.emit(ercpermit, "Transfer").withArgs(signers[0].address, routerropsten.address, amountToBridge);
      })
    })

    describe('revert tokens locking from zero address', async () => {
      it("Should revert when trying to lock tokens from zero address", async function () {
          const deadline = + new Date() + 60 * 60;
          const nonce = await ercpermit.nonces(signers[0].address);
          const name = await ercpermit.name();
          const permitSig = await permit(chainId, nonce.toNumber(), name, ercpermit.address, signers[0], routerropsten.address, amountToBridge, deadline);
          expect(routerropsten.lockTokens(amountToBridge, zeroAddress, deadline, permitSig.v, permitSig.r, permitSig.s, options))
          .to.be.revertedWith("ERC20: transfer from the zero address");
      })
    })

    describe('revert tokens locking with less amount', async () => {
      it("Should revert when trying to use the service with less ether", async function () {
        const deadline = + new Date() + 60 * 60;
        const nonce = await ercpermit.nonces(signers[0].address);
        const name = await ercpermit.name();
        const lessEther = {value: ethers.utils.parseEther("0.0001")};
        const permitSig = await permit(chainId, nonce.toNumber(), name, ercpermit.address, signers[0], routerropsten.address, amountToBridge, deadline);
        expect(routerropsten.lockTokens(amountToBridge, zeroAddress, deadline, permitSig.v, permitSig.r, permitSig.s, lessEther))
          .to.be.revertedWith("Contract should be paid 0.001 ETH to use the service");
      })
    })

    describe('revert locking 0 amount of tokens', async () => {
      it("Should revert when trying to lock 0 amount of ERC20 tokens", async function () {
        const deadline = + new Date() + 60 * 60;
        const nonce = await ercpermit.nonces(signers[0].address);
        const name = await ercpermit.name();
        const permitSig = await permit(chainId, nonce.toNumber(), name, ercpermit.address, signers[0], routerropsten.address, amountToBridge, deadline);
        expect(routerropsten.lockTokens(0, zeroAddress, deadline, permitSig.v, permitSig.r, permitSig.s, options))
          .to.be.revertedWith("Locking non-positive amount of tokens");
      })
    })

    describe('tokensClaimed mapping of contract address', async () => {
      it("Should not update tokensClaimed mapping of contractAddress when one-way bridging", async function () {
        const deadline = + new Date() + 60 * 60;
        const nonce = await ercpermit.nonces(signers[0].address);
        const name = await ercpermit.name();
        const permitSig = await permit(chainId, nonce.toNumber(), name, ercpermit.address, signers[0], routerropsten.address, amountToBridge, deadline);
          await routerropsten.lockTokens(amountToBridge, ercpermit.address, deadline, permitSig.v, permitSig.r, permitSig.s, options)
          const tokensClaimed = await routerropsten.getTokensClaimedAmount(ercpermit.address, signers[0].address);
          expect(tokensClaimed).to.eq(0);
      })
    })

    describe('Claim tokens', async () => {
      it("Should claim tokens", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessage = await signers[0].signMessage(arrayifyHash);

        await routerropsten.claimTokens(messageHash, signedMessage, ercpermit.address, amountToClaim);
        const wrappedTokenAddress = await routerropsten.getWrappedTokenAddress(ercpermit.address);
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
                                  .claimTokens(messageHash, signedMessageUserZero, ercpermit.address, amountToClaim))
                                  .to.be.revertedWith("Message sender didn't sign the claim transaction");
      })
    })

    describe('Unwrap tokens', async () => {
      it("Should burn tokens from ERC20 address", async function () {

        const messageToSign = "Yes, I want to claim tokens!";
	
			  const messageHash = ethers.utils.solidityKeccak256(['string'], [messageToSign]);
			  const arrayifyHash = ethers.utils.arrayify(messageHash);
	
			  const signedMessage = await signers[0].signMessage(arrayifyHash);

        await routerropsten.claimTokens(messageHash, signedMessage, ercpermit.address, amountToClaim);
        const wrappedTokenAddress = await routerropsten.getWrappedTokenAddress(ercpermit.address);
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
        const deadline = + new Date() + 60 * 60;
        const nonce = await ercpermit.nonces(signers[0].address);
        const name = await ercpermit.name();
        const permitSig = await permit(chainId, nonce.toNumber(), name, ercpermit.address, signers[0], routerropsten.address, amountToBridge, deadline);
        await expect(routerropsten.connect(signers[0]).lockTokens(amountToBridge, ercpermit.address, deadline, permitSig.v, permitSig.r, permitSig.s, options))
        .to.emit(ercpermit, "Transfer").withArgs(signers[0].address, routerropsten.address, amountToBridge);

          await expect(routerropsten.releaseTokens(ercpermit.address, amountToBridge))
          .to.emit(ercpermit, "Approval").withArgs(routerropsten.address, signers[0].address,  amountToBridge);

          await expect(ercpermit.transferFrom(routerropsten.address, signers[0].address, amountToBridge))
          .to.emit(ercpermit, "Transfer").withArgs(routerropsten.address, signers[0].address,  amountToBridge);
      })
    })
});
