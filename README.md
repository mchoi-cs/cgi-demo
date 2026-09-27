# Northwind Decision Room

A clickable boardroom demo. The brief asked for an AI that triages complaints and lifts the regulator score above 4.0. The six CSVs say that brief repeats the failed 2025 pilot. The room shows the queue, the two estates, the pilot, then live levers.

## Run it in one minute

```bash
python3 scripts/build_baseline.py
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click the five beats. The printable value case is `/value`.

```bash
npm test
```

## Diagnosis a presenter can defend

Opened 25,416 and closed 23,817 over 24 months, so the open book is 1,599 and it started at zero. Days rose from 9.1 to 38.2. Regulator score tracks first-contact resolution almost perfectly; a 4.0 needs FCR back near 58%, from 41% now. Barrowdale and Dunmoor still have 0% smart meters and about three to four estimated-read and no-read complaints per 1,000 accounts, against Ashford at 1.33. Of the 1,599 open cases, 1,095 are billing dispute, estimated read, or no read. AskNorthwind ran for nine months: containment 16% to 10%, £640k a year. Northwind Connect cannot show a bill breakdown. Do not add the pilot's "complaints after session" on top of the complaint file — implied volume is about 2,300 a month, larger than the ~1,000 complaints actually opened.

The recommended path is: leave the bot off, wrap the five systems in one read-to-bill desktop, and send corrected bills back into MeterHub. That is a pipe, not another assistant. The £76.8m smart-meter catch-up is optional and does not pay back in twelve months.

Cash uses the unit-cost file plus labelled team assumptions only (6 × 6 × £25k = £900k to build the API, £180k a year to run). The value case claims only the slice tied to a lever, never the whole £9.3m cost-to-serve rise.

## Layout

- `data/` — the six synthetic Northwind CSVs
- `scripts/build_baseline.py` — writes `src/data/baseline.json`
- `src/lib/scenario.ts` — 12-month (and 24-month smart-meter) forecast
- `POST /api/scenario` — same engine
- `src/app/page.tsx` — story and console
- `src/app/value/page.tsx` — one-page value case
