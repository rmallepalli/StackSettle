/**
 * Debt minimization algorithm.
 *
 * Given a list of player net balances across one or more games,
 * compute the minimum number of payment transactions needed to
 * settle all debts.
 *
 * Algorithm: greedy matching of largest creditor ↔ largest debtor.
 * This produces the minimum number of transactions for the common
 * case and runs in O(n log n).
 *
 * @param {Array<{ player_id, player_name, net_result, ...paymentFields }>} rows
 *   Flat rows from DB — multiple rows per player (one per game) are expected;
 *   we aggregate them first.
 * @returns {Array<{ from_player_id, from_name, to_player_id, to_name, amount, ...paymentInfo }>}
 */
function minimizeDebts(rows) {
  // 1. Aggregate net result per player across all rows
  const playerMap = {}
  for (const row of rows) {
    const id = row.player_id
    if (!playerMap[id]) {
      playerMap[id] = {
        player_id:    id,
        player_name:  row.player_name,
        venmo_handle: row.venmo_handle,
        zelle_contact:row.zelle_contact,
        paypal_handle:row.paypal_handle,
        cashapp_tag:  row.cashapp_tag,
        other_payment:row.other_payment,
        balance:      0,
      }
    }
    playerMap[id].balance += parseFloat(row.net_result || 0)
  }

  const players = Object.values(playerMap)

  // 2. Split into creditors (balance > 0) and debtors (balance < 0)
  //    Use cents (integers) to avoid floating-point drift
  const toCents = (n) => Math.round(n * 100)

  const creditors = players
    .filter((p) => toCents(p.balance) > 0)
    .map((p) => ({ ...p, balance: toCents(p.balance) }))
    .sort((a, b) => b.balance - a.balance)   // largest first

  const debtors = players
    .filter((p) => toCents(p.balance) < 0)
    .map((p) => ({ ...p, balance: toCents(p.balance) }))
    .sort((a, b) => a.balance - b.balance)   // most negative first

  const transactions = []
  let ci = 0  // creditor pointer
  let di = 0  // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor   = debtors[di]

    const amount = Math.min(creditor.balance, -debtor.balance)

    transactions.push({
      from_player_id:  debtor.player_id,
      from_name:       debtor.player_name,
      to_player_id:    creditor.player_id,
      to_name:         creditor.player_name,
      amount:          amount / 100,  // back to dollars
      // Payment info for the recipient (creditor)
      to_venmo:        creditor.venmo_handle,
      to_zelle:        creditor.zelle_contact,
      to_paypal:       creditor.paypal_handle,
      to_cashapp:      creditor.cashapp_tag,
      to_other:        creditor.other_payment,
    })

    creditor.balance -= amount
    debtor.balance   += amount

    if (creditor.balance === 0) ci++
    if (debtor.balance === 0)   di++
  }

  return transactions
}

module.exports = { minimizeDebts }
