'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useProposal, useBuy } from '@deriv/core';
import type {
  ActiveSymbol,
  Tick,
  ProposalInfo,
  ProposalParams,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import { useBaseTrading } from '@/hooks/use-base-trading';
import type { UseBaseTradingParams } from '@/hooks/use-base-trading';
import { computeDigitStats, getLastDigit } from '../lib/digit-stats';
import type { ContractMode, TradeType, DigitStats, OpenPosition, ClosedPosition } from '../lib/types';

const CONTRACT_TYPES = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD'];

interface UseDigitsTradingReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  contractMode: ContractMode;
  setContractMode: (mode: ContractMode) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  contractsAvailable: boolean;
  pipSize: number;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationLimits: DurationLimits;
  defaultStake: number;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
  martingaleMultiplier: number;
  setMartingaleMultiplier: (value: number) => void;
  stakeBareMultiplier: number;
  setStakeBareMultiplier: (value: number) => void;
  stakeMode: 'standard' | 'stake-bare';
  setStakeMode: (value: 'standard' | 'stake-bare') => void;
  takeProfit: string;
  setTakeProfit: (value: string) => void;
  stopLoss: string;
  setStopLoss: (value: string) => void;
  sessionPnl: number;
  effectiveStake: number;
  riskBlocked: boolean;
  resetSessionPnl: () => void;
}

export type UseDigitsTradingParams = Pick<
  UseBaseTradingParams,
  'ws' | 'isConnected' | 'isExhausted' | 'isAuthenticated' | 'onAuthWSFailed'
>;

export function useDigitsTrading({
  ws,
  isConnected,
  isExhausted,
  isAuthenticated,
  onAuthWSFailed,
}: UseDigitsTradingParams): UseDigitsTradingReturn {
  const {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    prices,
    pipSize,
    contractsAvailable,
    durationLimits,
    defaultStake,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  } = useBaseTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated,
    onAuthWSFailed,
    contractTypes: CONTRACT_TYPES,
  });

  const [tradeType, setTradeTypeRaw] = useState<TradeType>('matches-differs');
  const [contractMode, setContractMode] = useState<ContractMode>('DIGITMATCH');
  const [selectedDigit, setSelectedDigit] = useState<number>(5);
  const [stake, setStake] = useState<string>('10');
  const [duration, setDuration] = useState<number>(5);
  const [martingaleMultiplier, setMartingaleMultiplier] = useState<number>(2);
  const [stakeBareMultiplier, setStakeBareMultiplier] = useState<number>(2);
  const [stakeMode, setStakeMode] = useState<'standard' | 'stake-bare'>('standard');
  const [takeProfit, setTakeProfit] = useState<string>('100');
  const [stopLoss, setStopLoss] = useState<string>('50');
  const [sessionPnl, setSessionPnl] = useState<number>(0);

  const setTradeType = useCallback((type: TradeType) => {
    setTradeTypeRaw(type);
    switch (type) {
      case 'matches-differs':
        setContractMode('DIGITMATCH');
        break;
      case 'over-under':
        setContractMode('DIGITOVER');
        break;
      case 'even-odd':
        setContractMode('DIGITEVEN');
        break;
    }
  }, []);

  const digitStats: DigitStats = useMemo(() => computeDigitStats(prices, pipSize), [prices, pipSize]);

  const lastDigit = useMemo(() => {
    if (currentTick) {
      return getLastDigit(currentTick.quote, pipSize);
    }
    if (prices.length > 0) {
      return getLastDigit(prices[prices.length - 1], pipSize);
    }
    return null;
  }, [currentTick, prices, pipSize]);

  const {
    buyContract: buyWithProposal,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
  } = useBuy(tradingWs, tradingIsConnected);

  const effectiveStake = useMemo(() => {
    const baseStake = Number.parseFloat(stake) || 0;
    if (baseStake <= 0) return 0;
    const multiplier = tradeType === 'matches-differs' && stakeMode === 'stake-bare'
      ? stakeBareMultiplier
      : martingaleMultiplier;
    return baseStake * multiplier;
  }, [stake, tradeType, stakeMode, stakeBareMultiplier, martingaleMultiplier]);

  const riskBlocked = useMemo(() => {
    const tp = Number.parseFloat(takeProfit) || 0;
    const sl = Number.parseFloat(stopLoss) || 0;
    if (tp > 0 && sessionPnl >= tp) return true;
    if (sl > 0 && sessionPnl <= -sl) return true;
    return false;
  }, [sessionPnl, takeProfit, stopLoss]);

  const proposalParams: ProposalParams | null = useMemo(() => {
    if (isBuying || !activeSymbol || riskBlocked) return null;
    if (!effectiveStake || effectiveStake <= 0) return null;

    const needsBarrier = contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';

    return {
      contractType: contractMode,
      symbol: activeSymbol.underlying_symbol,
      amount: effectiveStake,
      duration,
      durationUnit: 't',
      basis: 'stake' as const,
      currency: 'USD',
      ...(needsBarrier ? { barrier: selectedDigit } : {}),
    };
  }, [activeSymbol, contractMode, effectiveStake, duration, selectedDigit, isBuying, riskBlocked]);

  const { proposal } = useProposal(tradingWs, tradingIsConnected, proposalParams);

  useEffect(() => {
    if (!buyResult || !proposal) return;
    const estimatedPnL = proposal.payout - effectiveStake;
    setSessionPnl((prev) => prev + estimatedPnL);
  }, [buyResult, proposal, effectiveStake]);

  const buyContract = useCallback(async () => {
    if (riskBlocked) {
      throw new Error('Risk thresholds reached. Adjust your strategy settings.');
    }
    if (proposal) {
      await buyWithProposal(proposal);
    }
  }, [proposal, buyWithProposal, riskBlocked]);

  const resetSessionPnl = useCallback(() => {
    setSessionPnl(0);
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    lastDigit,
    digitStats,
    tradeType,
    setTradeType,
    contractMode,
    setContractMode,
    selectedDigit,
    setSelectedDigit,
    contractsAvailable,
    pipSize,
    stake,
    setStake,
    duration,
    setDuration,
    durationLimits,
    defaultStake,
    proposal,
    isProposalLoading: isConnected && proposalParams !== null && proposal === null,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
    martingaleMultiplier,
    setMartingaleMultiplier,
    stakeBareMultiplier,
    setStakeBareMultiplier,
    stakeMode,
    setStakeMode,
    takeProfit,
    setTakeProfit,
    stopLoss,
    setStopLoss,
    sessionPnl,
    effectiveStake,
    riskBlocked,
    resetSessionPnl,
  };
}
