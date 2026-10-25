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

function formatSignedMoney(value: number): string {
  const prefix = value >= 0 ? '+' : '-';
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
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
    <div className="space-y-3 sm:space-y-4">
      <ToggleGroup
        type="single"
        value={contractMode}
        onValueChange={(value) => {
          if (value) onContractModeChange(value as ContractMode);
        }}
        className="w-full gap-0 rounded-full bg-muted/70 p-1 shadow-inner ring-1 ring-border/60"
      >
        {modeOptions.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="flex-1 rounded-full border border-transparent text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=on]:border-primary/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm data-[state=on]:font-bold"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="stake" className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
            className="h-11 rounded-xl border-border/80 bg-background/80 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
            className="h-11 rounded-xl border-border/80 bg-background/80 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-background via-background to-primary/[0.02] p-3 shadow-inner shadow-primary/5 ring-1 ring-border/70">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Localize i18n_default_text="Strategy" />
          </span>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary">
            {effectiveStake.toFixed(2)} USD
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <Localize i18n_default_text="Mode" />
            </Label>
            <div className="flex rounded-full bg-muted/70 p-1 shadow-inner ring-1 ring-border/60">
              <button
                type="button"
                onClick={() => setStakeMode('standard')}
                className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  stakeMode === 'standard' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Localize i18n_default_text="Martingale" />
              </button>
              <button
                type="button"
                onClick={() => setStakeMode('stake-bare')}
                className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  stakeMode === 'stake-bare' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Localize i18n_default_text="Stake Bare" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
              className="h-11 w-full rounded-xl border border-border/80 bg-background/90 px-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              {[2, 3, 4, 5, 6, 7].map((multiplier) => (
                <option key={multiplier} value={multiplier}>
                  {multiplier}x
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="takeProfit" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
              className="h-11 rounded-xl border-border/80 bg-background/80 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stopLoss" className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
              className="h-11 rounded-xl border-border/80 bg-background/80 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-border/80 bg-background/40 px-2.5 py-2 text-[11px] text-muted-foreground">
          <span>
            <Localize i18n_default_text="Session P/L" />
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${sessionPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatSignedMoney(sessionPnl)}
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

      <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 shadow-inner shadow-primary/5">
        <p className="text-[11px] mb-2 font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <Localize i18n_default_text="Prediction" />
        </p>
        <p className="text-sm font-medium text-foreground">
          <Localize i18n_default_text="Last digit of the price will" />{' '}
          <span className="text-primary font-bold">
            {getPredictionText(contractMode, localize)}
          </span>
          {showDigitInPrediction(contractMode) && (
            <>
              {' '}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                {selectedDigit}
              </span>
            </>
          )}
        </p>
        {(proposal || isProposalLoading) && (
          <div className="mt-3 flex items-center justify-between border-t border-border/80 pt-2.5">
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

      {riskBlocked && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
          <Localize i18n_default_text="Risk guard active: session thresholds are reached. Adjust your strategy settings." />
        </div>
      )}

      <div className={isMobile ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] left-3 right-3' : undefined}>
        <Button
          className="h-11 w-full rounded-full bg-gradient-to-r from-primary to-primary/80 px-6 text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-[1.01] hover:shadow-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
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

            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            