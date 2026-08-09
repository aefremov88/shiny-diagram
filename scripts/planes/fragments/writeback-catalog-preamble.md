# Anchor vocabulary

Statement insertion builders name the insertion position first:

- `anchorAfterKindList` — after the latest statement matching a kind list.
- `anchorAfterPredecessorOf` — after the predecessor of a target position; used when
  that predecessor is deleted in the same transaction.
- `anchorAfterExactStatement` — after one explicit statement.
- `anchorAboveStatement` — directly above one explicit living target. Produces the
  label-free `aboveStatement` anchor for binding writes, with no blank line between
  the inserted statement and its target.
- `anchorBlockOpening` — at the first-child position of a block. Produces the
  label-free `atBlockOpening` anchor.

After-statement anchors are labeled `afterSameKind` or `afterDifferentKind` to select
their blank-line policy. `aboveStatement` and `atBlockOpening` are label-free because
each has exactly one legal whitespace policy.
