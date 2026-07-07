import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Typography, Autocomplete, TextField, Stack } from '@mui/material';
import { getCratesByCategory } from '../../../services/dataService';
import { useCalculator } from '../hooks/useCalculator';
import type { Crate, CrateOption } from '../../../types';

export function CrateConversion() {
  const { selectedCategoryId, combinedCosts } = useCalculator();
  const crates = useMemo(() => {
    const categoryCrates = getCratesByCategory(selectedCategoryId ?? '');
    const hasCosts = Object.keys(combinedCosts).length > 0;
    if (!hasCosts) return categoryCrates;
    const matched = categoryCrates.filter(c =>
      c.options.some(o => (combinedCosts[o.materialKey] ?? 0) > 0)
    );
    return matched.length > 0 ? matched : categoryCrates;
  }, [selectedCategoryId, combinedCosts]);

  const [selectedCrate, setSelectedCrate] = useState<Crate | null>(null);
  const [selectedOption, setSelectedOption] = useState<CrateOption | null>(null);
  const [amountNeeded, setAmountNeeded] = useState<number>(0);

  useEffect(() => {
    if (crates.length === 1) setSelectedCrate(crates[0]);
  }, [crates]);

  useEffect(() => {
    if (!selectedCrate) return;
    if (!crates.some(c => c.id === selectedCrate.id)) {
      setSelectedCrate(null);
      setSelectedOption(null);
      setAmountNeeded(0);
    }
  }, [crates]);

  useEffect(() => {
    if (!selectedCrate) {
      setSelectedOption(null);
      setAmountNeeded(0);
      return;
    }
    const match = selectedCrate.options.find(o => (combinedCosts[o.materialKey] ?? 0) > 0);
    if (match) {
      setSelectedOption(match);
      setAmountNeeded(combinedCosts[match.materialKey]);
    } else {
      setSelectedOption(null);
      setAmountNeeded(0);
    }
  }, [selectedCrate]);

  useEffect(() => {
    if (!selectedOption) return;
    const val = combinedCosts[selectedOption.materialKey];
    if (val && val > 0) setAmountNeeded(val);
  }, [selectedOption]);

  const handleCrateChange = (_: unknown, value: Crate | null) => {
    setSelectedCrate(value);
  };

  const cratesNeeded =
    selectedOption && amountNeeded > 0
      ? Math.ceil(amountNeeded / selectedOption.amount)
      : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Crate Conversion</Typography>
        <Stack spacing={2}>
          <Autocomplete
            options={crates}
            value={selectedCrate}
            onChange={handleCrateChange}
            getOptionLabel={c => c.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={params => <TextField {...params} label="Crate" size="small" />}
          />
          {selectedCrate && (
            <Autocomplete
              options={selectedCrate.options}
              value={selectedOption}
              onChange={(_, v) => setSelectedOption(v)}
              getOptionLabel={o => `${o.materialName} (${o.amount} per crate)`}
              isOptionEqualToValue={(a, b) => a.materialKey === b.materialKey}
              renderInput={params => <TextField {...params} label="Material" size="small" />}
            />
          )}
          {selectedOption && (
            <TextField
              label="Total amount needed"
              type="number"
              size="small"
              value={amountNeeded || ''}
              onChange={e => setAmountNeeded(Math.max(0, Number(e.target.value)))}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          )}
          {cratesNeeded > 0 && (
            <Typography>
              You need <strong>{cratesNeeded}</strong> crate{cratesNeeded > 1 ? 's' : ''}.
              Each gives {selectedOption!.amount} of {selectedOption!.materialName}.
              Total needed: {amountNeeded}.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
