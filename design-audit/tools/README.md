# design-audit/tools

Re-runnable checks. These are what make the audit verifiable rather than a claim.

```bash
# the 10 gates — must all report 0
node design-audit/tools/gates.js design-audit/tools/in-scope-files.txt

# before/after metrics against the pre-audit commit
node design-audit/tools/metrics.js design-audit/tools/in-scope-files.txt
```

`gates.js` exits with `ALL GATES PASS` on stderr when clean. Run it before merging any
UI change — a new screen that drifts off the token scale will fail it.

`replace-map.js` is the safe literal replacer used for the sweeps. It escapes every regex
metacharacter and **self-checks at startup**, refusing to run if escaping is broken. An
earlier hand-rolled version silently failed and resized icons across 124 files; that is why
the self-check exists.
