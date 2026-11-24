"""Exact no-adjacent-repeat occupancy probability, using integer inclusion-exclusion."""
from collections import defaultdict
from fractions import Fraction
from itertools import product
from math import comb
from pathlib import Path
import json
import time


def count_at_most_one_heavy(fighters, draws, threshold):
    # Replace c copies of one character by j nonempty blocks. Inclusion-exclusion
    # of the c-j bonds eliminates sequences having equal adjacent characters.
    dp = {(0, 0, 0): 1}
    for _ in range(fighters):
        nxt = defaultdict(int)
        for (used, blocks, heavy), value in dp.items():
            nxt[used, blocks, heavy] += value
            for count in range(1, draws - used + 1):
                updated = heavy + (count >= threshold)
                if updated > 1:
                    continue
                for split in range(1, count + 1):
                    sign = -1 if (count - split) % 2 else 1
                    nxt[used + count, blocks + split, updated] += (
                        value * comb(count - 1, split - 1)
                        * comb(blocks + split, split) * sign
                    )
        dp = {state: value for state, value in nxt.items() if value}
    return sum(value for (used, _, _), value in dp.items() if used == draws)


# Verify the counting identity against all valid sequences in small cases.
for fighters, draws, threshold in [(2, 5, 2), (3, 5, 2), (3, 7, 3), (4, 6, 2)]:
    expected = 0
    for sequence in product(range(fighters), repeat=draws):
        if any(a == b for a, b in zip(sequence, sequence[1:])):
            continue
        if sum(sequence.count(f) >= threshold for f in range(fighters)) <= 1:
            expected += 1
    assert count_at_most_one_heavy(fighters, draws, threshold) == expected

started = time.perf_counter()
total = 40 * 39 ** 49
complement = count_at_most_one_heavy(40, 50, 5)
probability = Fraction(total - complement, total)
result = {
    'method': 'Exact integer inclusion-exclusion of equal-neighbour bonds',
    'smallCasesCheckedAgainstExhaustiveEnumeration': 4,
    'fighters': 40, 'draws': 50, 'excludePrevious': True,
    'event': 'At least two fighter types each appear at least five times',
    'probability': float(probability),
    'numerator': str(probability.numerator),
    'denominator': str(probability.denominator),
    'elapsedSeconds': time.perf_counter() - started,
}
path = Path(__file__).resolve().parent.parent / 'reports/repeat-frequency-audit.json'
report = json.loads(path.read_text()) if path.exists() else {}
report['exactPreviousExcluded'] = result
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, indent=2))
