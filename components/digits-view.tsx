'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Localize } from '@deriv-com/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import type {
  ContractMode,
  TradeType,
  DurationLimits,
  ProposalInfo,
  BuyResult,
} from '../lib/types';

interface TradeControlsProps {
  tradeType: TradeType;
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  selectedDigit: number;
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  onBuy: () => void;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  isAuthenticated?: boolean;
  isMobile?: boolean;
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

function getContractModeOptions(
  localize: (text: string) => string
): Record<TradeType, { value: ContractMode; label: string }[]> {
  return {
    'matches-differs': [
      { value: 'DIGITMATCH', label: localize('Matches') },
      { value: 'DIGITDIFF', label: localize('Differs') },
    ],
    'over-under': [
      { value: 'DIGITOVER', label: localize('Over') },
      { value: 'DIGITUNDER', label: localize('Under') },
    ],
    'even-odd': [
      { value: 'DIGITEVEN', label: localize('Even') },
      { value: 'DIGITODD', label: localize('Odd') },
    ],
  };
}

function getPredictionText(
  contractMode: ContractMode,
  localize: (text: string) => string
): string {
  switch (contractMode) {
    case 'DIGITMATCH':
      return localize('match');
    case 'DIGITDIFF':
      return localize('differ from');
    case 'DIGITOVER':
      return localize('be over');
    case 'DIGITUNDER':
      return localize('be under');
    case 'DIGITEVEN':
      return localize('be even');
    case 'DIGITODD':
      return localize('be odd');
  }
}

function showDigitInPrediction(contractMode: ContractMode): boolean {
  return contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
}

export function TradeControls({
  tradeType,
  contractMode,
  onContractModeChange,
  selectedDigit,
  isConnected,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  durationLimits,
  proposal,
  isProposalLoading,
  onBuy,
  isBuying,
  buyResult,
  buyError,
  onClearBuyResult,
  isAuthenticated,
  isMobile,
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
}: TradeControlsProps) {
  const { localize } = useAppTranslations();

  useEffect(() => {
    if (buyError) {
      toast.error(localize('Purchase Failed'), { description: buyError });
      onClearBuyResult();
    }
  }, [buyError, onClearBuyResult, localize]);

  useEffect(() => {
    if (buyResult) {
      toast.success(localize('Contract Purchased'), {
        description: localize(
          'Buy price: {{buyPrice}} USD | Payout: {{payout}} USD | Balance: {{balance}} USD',
          {
            buyPrice: buyResult.buyPrice.toFixed(2),
            payout: buyResult.payout.toFixed(2),
            balance: buyResult.balanceAfter.toFixed(2),
          }
        ),
      });
      onClearBuyResult();
    }
  }, [buyResult, onClearBuyResult, localize]);

  const modeOptions = getContractModeOptions(localize)[tradeType];

  return (
    <div className="space-y-2 sm:space-y-4">
      <ToggleGroup
        type="single"
        value={contractMode}
        onValueChange={(value) => {
          if (value) onContractModeChange(value as ContractMode);
        }}
        className="w-full gap-0 rounded-full bg-muted p-1"
      >
        {modeOptions.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:font-bold data-[state=on]:shadow-sm"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="stake" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Stake" />
          </Label>
          <Input
            id="stake"
            type="number"
            value={stake}
            onChange={(e) => onStakeChange(e.target.value)}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            min={0}
            step="0.01"
            labelRight="USD"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs text-muted-foreground">
            <Localize i18n_default_text="Duration" />
          </Label>
          <Input
            id="duration"
            type="number"
            value={duration}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onDurationChange(val);
            }}
            min={durationLimits.min}
            max={durationLimits.max}
            step={1}
            labelRight={localize('Ticks')}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <Localize i18n_default_text="Strategy" />
          </span>
          <span className="text-xs font-medium text-foreground">{effectiveStake.toFixed(2)} USD</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              <Localize i18n_default_text="Mode" />
            </Label>
            <div className="flex rounded-full bg-background p-1">
              <button
                type="button"
                onClick={() => setStakeMode('standard')}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${
                  stakeMode === 'standard' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Localize i18n_default_text="Martingale" />
              </button>
              <button
                type="button"
                onClick={() => setStakeMode('stake-bare')}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${
                  stakeMode === 'stake-bare' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Localize i18n_default_text="Stake Bare" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              <Localize i18n_default_text="Multiplier" />
            </Label>
            <select
              value={stakeMode === 'stake-bare' ? stakeBareMultiplier : martingaleMultiplier}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (stakeMode === 'stake-bare') {
                  setStakeBareMultiplier(value);
                } else {
                  setMartingaleMultiplier(value);
                }
              }}
              className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {[2, 3, 4, 5, 6, 7].map((multiplier) => (
                <option key={multiplier} value={multiplier}>
                  {multiplier}x
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="takeProfit" className="text-[11px] text-muted-foreground">
              <Localize i18n_default_text="Take Profit" />
            </Label>
            <Input
              id="takeProfit"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              min={0}
              step="0.01"
              labelRight="USD"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stopLoss" className="text-[11px] text-muted-foreground">
              <Localize i18n_default_text="Stop Loss" />
            </Label>
            <Input
              id="stopLoss"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              min={0}
              step="0.01"
              labelRight="USD"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
          <span>
            <Localize i18n_default_text="Session P/L" />
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${sessionPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {sessionPnl >= 0 ? '+' : '-'}${Math.abs(sessionPnl).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={resetSessionPnl}
              className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline-offset-2 hover:underline"
            >
              <Localize i18n_default_text="Reset" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-2 sm:p-3 bg-muted/20 space-y-1.5 sm:space-y-2">
        <p className="text-[11px] sm:text-xs text-muted-foreground mb-0 sm:mb-1">
          <Localize i18n_default_text="Prediction" />
        </p>
        <p className="text-xs sm:text-sm font-medium">
          <Localize i18n_default_text="Last digit of the price will" />{' '}
          <span className="text-primary font-bold">
            {getPredictionText(contractMode, localize)}
          </span>
          {showDigitInPrediction(contractMode) && (
            <>
              {' '}
              <span className="inline-flex w-5 h-5 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs font-bold">
                {selectedDigit}
              </span>
            </>
          )}
        </p>
        {(proposal || isProposalLoading) && (
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">
              <Localize i18n_default_text="Payout" />
            </span>
            {isProposalLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="text-sm font-bold text-foreground">
                {proposal!.payout.toFixed(2)} USD
              </span>
            )}
          </div>
        )}
      </div>

      <div className={isMobile ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] left-3 right-3' : undefined}>
        <Button
          className="w-full h-10 rounded-full px-6 sm:h-11 sm:px-8"
          disabled={!isConnected || !proposal || isBuying || riskBlocked}
          onClick={onBuy}
        >
          {riskBlocked
            ? localize('Risk guard active')
            : isBuying
              ? localize('Purchasing...')
              : proposal
                ? localize('Buy @ {{price}} USD', {
                    price: proposal.askPrice.toFixed(2),
                  })
                : localize('Buy Contract')}
        </Button>
      </div>

      {isAuthenticated && (
        <Button asChild variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground">
          <Link href="/reports">
            <Localize i18n_default_text="View your positions →" />
          </Link>
        </Button>
      )}
    </div>
  );
}
