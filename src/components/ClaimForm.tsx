import * as React from "react";
import { useEffect, useState } from "react";

import { FormGroup, Label, Input } from "../Forms";
import Button from "./Button";

import claimTokensTx from "../scripts/claim";
import releaseTokenTx from "../scripts/releaseTx";
import transferRouterUserTx from "../scripts/transferRouterToUser";

import { Web3Provider } from "@ethersproject/providers";
import { getDefaultProvider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { isAddress } from "@ethersproject/address";

import * as ERCABI from "../abis/ERC20ABI.json";
import * as RouterABI from "../abis/RoutersABI.json";

function ClaimForm(props: any) {
  const ROPSTEN_NETWORK = "ropsten";
  const RINKEBY_NETWORK = "rinkeby";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const [provider, setProvider] = useState<any>(
    new Web3Provider(window.ethereum, "any")
  );
  const [signer, setSigner] = useState<any>(provider.getSigner());

  const [amount, setAmount] = useState<number>(props.amount);
  const [tokenAddress, setTokenAddress] = useState<string>(props.contractAddr);

  const [isValidAddress, setIsValidAddress] = useState<boolean>(true);
  const [isNullAddress, setIsNullAddress] = useState<boolean>(false);

  const [lockedAmount, setLockedAmount] = useState<number>(0);

  const [pendingState, setPendingState] = useState<boolean>(false);
  const [transferBack, setTransferBack] = useState<boolean>(false);

  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [claimedAmount, setClaimedAmount] = useState<number>(-1);

  const [txDetails, settxDetails] = useState<string>("");

  useEffect(() => {
    const validAddress = isAddress(tokenAddress);
    if (validAddress) {
      setIsValidAddress(true);
      setIsNullAddress(false);
      if (props.hasLocked) {
        checkTokenLocked(tokenAddress);
        subscribeToRouterContractEvents();
      } else if (props.hasUnwrapped) {
        subscribeToERCContractEvents(tokenAddress);
      }
    }
  }, []);

  const subscribeToRouterContractEvents = async () => {
    const provider = new Web3Provider(window.ethereum, "any");
    const network = await provider.getNetwork();

    const RouterAddress =
      network.name === ROPSTEN_NETWORK
        ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS!
        : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS!;

    const RouterContract = new Contract(RouterAddress, RouterABI, provider);

    await RouterContract.on(
      "TokensClaimed",
      (claimer, amount, wrappedTokenAddr, event) => {
        localStorage.removeItem(claimer);
        setAmount(0);
        setClaimedAmount(amount);
        setLockedAmount(amount);
        setPendingState(false);
        settxDetails(
          "Transaction " +
            event.transactionHash +
            " validated!\n" +
            "Wrapped Token Address: " +
            wrappedTokenAddr
        );
      }
    );
  };

  /* Handles WTK to Native token events -> Approve(routerContract, signerAddress) and TransferFrom(routerContract, signerAddress) */
  const subscribeToERCContractEvents = async (tokenAddress: string) => {
    if (isAddress(tokenAddress)) {
      const network = await provider.getNetwork();

      const ERCContract = new Contract(tokenAddress, ERCABI, provider);

      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();

      await ERCContract.on("Approval", (owner, spender, value, event) => {
        if (spender === signerAddress) {
          setPendingState(false);
          setTransferBack(true);
          settxDetails("Transaction " + event.transactionHash + " validated!");
        }
      });

      await ERCContract.on("Transfer", (from, to, value, event) => {
        const routerAddress =
          network.name === ROPSTEN_NETWORK
            ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS
            : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS;
        if (from === routerAddress && to === signerAddress) {
          settxDetails("Transaction " + event.transactionHash + " validated!");
          setTransferBack(false);
          // props.onTransferBack();
        }
      });
    }
  };

  const checkTokenClaimed = async (nativeToken: string) => {
    const network = await provider.getNetwork();
    const routerAddr =
      network.name === ROPSTEN_NETWORK
        ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS!
        : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS!;

    const RouterContract = new Contract(routerAddr, RouterABI, provider);
    const wrappedTokenAddr = await RouterContract.getWrappedTokenAddress(
      nativeToken
    );
    const wrappedTokenExists = wrappedTokenAddr.toString() !== ZERO_ADDRESS;

    if (wrappedTokenExists) {
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      const wrappedTokensAmount = await RouterContract.getTokensClaimedAmount(
        wrappedTokenAddr.toString(),
        signerAddress
      );
      setClaimedAmount(wrappedTokensAmount.toNumber());
      // await checkTokenLocked(nativeToken);
    } else {
      setHasClaimed(false);
      //await checkTokenLocked(nativeToken);
    }
  };

  /* Goes to the ERC20 token contract on the opposite network and fetches Router balance (a.k.a how much tokens the user has locked) */
  const checkTokenLocked = async (tokenAddr: string) => {
    const network = await provider.getNetwork();
    const routerAddrInverted =
      network.name === RINKEBY_NETWORK
        ? process.env.REACT_APP_ROUTERROPSTEN_ADDRESS!
        : process.env.REACT_APP_ROUTERRINKEBY_ADDRESS!;

    const oppositeNetwork =
      network.name === RINKEBY_NETWORK ? ROPSTEN_NETWORK : RINKEBY_NETWORK;
    const oppositeProvider = getDefaultProvider(oppositeNetwork);

    try {
      const ERCContract = new Contract(tokenAddr, ERCABI, oppositeProvider);

      const amountOfLockedTokens = await ERCContract.balanceOf(
        routerAddrInverted
      );
      if (!amountOfLockedTokens.isZero()) {
        setLockedAmount(amountOfLockedTokens.toNumber());
      } else {
        setLockedAmount(0);
      }
    } catch (error) {
      const code = await provider.getCode(tokenAddress);
      if (code === "0x") {
        setLockedAmount(0);
      }
    }
  };

  const onChangeTokenAddress = async (e: any) => {
    const addr = e.target.value;
    setTokenAddress(addr);
    if (isAddress(addr)) {
      setIsValidAddress(true);
      const code = await provider.getCode(addr); //'0x' when claiming, !== '0x' when releasing
      if (props.hasUnwrapped) {
        await subscribeToERCContractEvents(addr);
      } else if (props.hasLocked && claimedAmount === -1) {
        // locked but hasn't claimed
        await checkTokenLocked(addr);
      } else if (claimedAmount !== -1) {
        // claimed a token and now wants to claim another token
        await checkTokenClaimed(addr);
        await checkTokenLocked(addr);
      }
    } else {
      setIsValidAddress(false);
    }
  };

  const onRelease = async (tokenAddr, amount) => {
    settxDetails("");
    releaseTokenTx(tokenAddr, amount).then((result) => {
      result ? setPendingState(true) : setPendingState(false);
    });
  };

  const onTransferBack = async (tokenAddr, amount) => {
    settxDetails("");
    transferRouterUserTx(tokenAddr, amount).then((result) => {
      result ? setPendingState(true) : setPendingState(false);
    });
  };

  const enableMint = function() {
    if (lockedAmount !== 0 && claimedAmount === -1) {
      // if locked but hasn't claimed any
      return amount !== lockedAmount;
    } else if (claimedAmount !== -1) {
      return lockedAmount === claimedAmount;
    }
    // if(!isValidAddress || isNullAddress) {
    //   return false;
    // }
    // if(lockedAmount !== 0 && !hasClaimed) {
    //   return amount !== lockedAmount;
    // }
    // if(hasClaimed) {
    //   return claimedAmount === lockedAmount;
    // } else {
    //   return true;
    // }
  };

  const onClaim = async () => {
    settxDetails("");
    claimTokensTx(tokenAddress, amount).then((result) => {
      result ? setPendingState(true) : setPendingState(false);
    });
  };

  const onArrow = async () => {
    props.onArrow();
  };

  return (
    <div id="claimForm">
      <Button outline={true} color="palevioletred">
        {" "}
        <img src={require("./arrow.jpg")} onClick={() => onArrow()}></img>
      </Button>
      <FormGroup>
        <Label htmlFor="label">Claim ERC-20 token address</Label>
        <Input
          id="claimTokenAddr"
          onChange={(event) => onChangeTokenAddress(event)}
          value={tokenAddress}
        />
      </FormGroup>
      <FormGroup>
        <Label>Amount</Label>
        <Input
          id="amount"
          onChange={(event) =>
            setAmount(
              !isNaN(parseInt(event.target.value, 10))
                ? parseInt(event.target.value, 10)
                : 0
            )
          }
          value={amount}
        />
      </FormGroup>
      <FormGroup>
        {props.hasLocked && !props.hasUnwrapped && (
          <Button disabled={enableMint()} onClick={() => onClaim()}>
            Claim
          </Button>
        )}
        {props.hasUnwrapped && !transferBack && (
          <Button
            disabled={!isValidAddress || isNullAddress}
            onClick={() => onRelease(tokenAddress, amount)}
          >
            Release
          </Button>
        )}
        {transferBack && (
          <Button
            disabled={!isValidAddress || isNullAddress}
            onClick={() => onTransferBack(tokenAddress, amount)}
          >
            Claim Native Token
          </Button>
        )}
      </FormGroup>
      <div id="transactionInfo">
        {pendingState && <Label>Transaction pending...</Label>}
        <Label>
          {!pendingState && txDetails !== "" && (
            <img src={require("./b-tick.jpg")}></img>
          )}{" "}
          {txDetails}{" "}
        </Label>
        {!isValidAddress && (
          <p id="contractValid"> Not a valid contract address!</p>
        )}
        {lockedAmount !== amount &&
          props.hasLocked &&
          !props.hasUnwrapped &&
          claimedAmount !== lockedAmount && (
            <p id="tokenLocked">
              {" "}
              You haven't locked this amount of tokens in the opposite network!
            </p>
          )}
      </div>
    </div>
  );
}

export default ClaimForm;
