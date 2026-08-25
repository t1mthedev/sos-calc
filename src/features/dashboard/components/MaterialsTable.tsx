import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { BackpackData } from '../../../types';
import { MaterialIcon } from '../../../components/MaterialIcon';

export const MATERIAL_LABELS: Record<string, string> = {
  manuals: 'Tactical Analysis',
  boards: 'Optical Storage Boards',
  fiber: 'Luminous Fiber',
  fuel: 'Nuclear Fuel Rod',
  coating: 'Antimatter Coating',
  alloy: 'Reinforced Alloy',
  neuronal: 'Neuronal Medium',
};

const SORT_ORDER = ['manuals', 'boards', 'fiber', 'fuel', 'coating', 'alloy', 'neuronal'];

export function sortMaterialEntries(totals: Record<string, number>): [string, number][] {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  entries.sort((a, b) => {
    const ai = SORT_ORDER.indexOf(a[0]);
    const bi = SORT_ORDER.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return entries;
}

export interface MaterialsTableSectionMk {
  mk: string;
  upgradeCount: number;
  entries: [string, number][];
}

export interface MaterialsTableSection {
  name: string;
  upgradeCount: number;
  entries?: [string, number][];
  mks: MaterialsTableSectionMk[];
  totalEntries: [string, number][];
}

interface MaterialsTableProps {
  entries?: [string, number][];
  backpack: BackpackData;
  crateContributions: Record<string, number>;
  showBackpack?: boolean;
  sections?: MaterialsTableSection[];
}

function MaterialRow({
  entry,
  backpack,
  crateContributions,
  emphasized = false,
}: {
  entry: [string, number];
  backpack: BackpackData;
  crateContributions: Record<string, number>;
  emphasized?: boolean;
}) {
  const [key, val] = entry;
  const have = backpack.materials[key] ?? 0;
  const fromCrates = crateContributions[key] ?? 0;
  const remaining = Math.max(0, val - have);
  const remainingWithCrates = Math.max(0, val - have - fromCrates);
  const boldSx = emphasized ? { fontWeight: 600 } : undefined;
  return (
    <TableRow sx={emphasized ? { bgcolor: 'action.hover' } : undefined}>
      <TableCell sx={{ width: 40 }}><MaterialIcon materialKey={key} /></TableCell>
      <TableCell sx={boldSx}>{MATERIAL_LABELS[key] ?? key}</TableCell>
      <TableCell align="right" sx={boldSx}>{val.toLocaleString()}</TableCell>
      <TableCell align="right">
        {have > 0 ? (
          <>
            <Typography component="span" variant="body2">{have.toLocaleString()}</Typography>
            {fromCrates > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
                {have + fromCrates} with crates
              </Typography>
            )}
          </>
        ) : fromCrates > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {fromCrates} (crates)
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">0</Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography
          component="span"
          variant="body2"
          sx={{ fontWeight: 600, color: remaining === 0 ? 'success.main' : 'warning.main' }}
        >
          {remaining.toLocaleString()}
        </Typography>
        {fromCrates > 0 && remainingWithCrates < remaining && (
          <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'nowrap', color: 'warning.light', fontStyle: 'italic' }}>
            {remainingWithCrates.toLocaleString()} with crates
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}

export function MaterialsTable({ entries = [], backpack, crateContributions, showBackpack = true, sections = [] }: MaterialsTableProps) {
  const colSpan = showBackpack ? 5 : 3;
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>Icon</TableCell>
            <TableCell>Material</TableCell>
            <TableCell align="right">Total</TableCell>
            {showBackpack && (
              <>
                <TableCell align="right">Have</TableCell>
                <TableCell align="right">Remaining</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(entry => (
            <MaterialRow key={entry[0]} entry={entry} backpack={backpack} crateContributions={crateContributions} />
          ))}

          {sections.map(section => (
            <TableFragment
              key={section.name}
              section={section}
              colSpan={colSpan}
              backpack={backpack}
              crateContributions={crateContributions}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TableFragment({
  section,
  colSpan,
  backpack,
  crateContributions,
}: {
  section: MaterialsTableSection;
  colSpan: number;
  backpack: BackpackData;
  crateContributions: Record<string, number>;
}) {
  return (
    <>
      <TableRow>
        <TableCell colSpan={colSpan} sx={{ p: 0, borderBottom: 0, bgcolor: 'background.default' }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 700 }}>
                {section.name} ({section.upgradeCount} upgrade{section.upgradeCount !== 1 ? 's' : ''})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Table size="small">
                <TableBody>
                  {section.entries?.map(entry => (
                    <MaterialRow key={entry[0]} entry={entry} backpack={backpack} crateContributions={crateContributions} />
                  ))}
                  {section.mks.map(mk => (
                    <FragmentMk
                      key={mk.mk}
                      mk={mk}
                      colSpan={colSpan}
                      backpack={backpack}
                      crateContributions={crateContributions}
                    />
                  ))}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        </TableCell>
      </TableRow>
      {section.totalEntries.length > 0 && (
        <TableRow>
          <TableCell
            colSpan={colSpan}
            sx={{ fontWeight: 600, color: 'text.secondary' }}
          >
            Total · {section.name}
          </TableCell>
        </TableRow>
      )}
      {section.totalEntries.map(entry => (
        <MaterialRow
          key={entry[0]}
          entry={entry}
          backpack={backpack}
          crateContributions={crateContributions}
          emphasized
        />
      ))}
    </>
  );
}

function FragmentMk({
  mk,
  colSpan,
  backpack,
  crateContributions,
}: {
  mk: MaterialsTableSectionMk;
  colSpan: number;
  backpack: BackpackData;
  crateContributions: Record<string, number>;
}) {
  return (
    <>
      <TableRow>
        <TableCell
          colSpan={colSpan}
          sx={{ fontWeight: 600, pl: 3 }}
        >
          {mk.mk} ({mk.upgradeCount} upgrade{mk.upgradeCount !== 1 ? 's' : ''})
        </TableCell>
      </TableRow>
      {mk.entries.map(entry => (
        <MaterialRow key={entry[0]} entry={entry} backpack={backpack} crateContributions={crateContributions} />
      ))}
    </>
  );
}
