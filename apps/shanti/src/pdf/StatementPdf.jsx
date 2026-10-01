import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { ensureStatementFontsRegistered, STATEMENT_FONT } from './fonts.js'
import { formatMoney } from '../lib/format.js'
import { formatDateShort } from '../lib/date.js'
import { closingBalanceLabelKey, isBalanceSettled } from '../lib/statement.js'
import { t } from '../i18n/LanguageContext.jsx'

ensureStatementFontsRegistered()

const ACCENT = '#0D9488'
const ACCENT_SOFT = '#E3FAF6'
const INK = '#1D1D1F'
const MUTED = '#6E6E73'
const HAIRLINE = '#E2E2E6'
const ROW_ALT = '#FAFAFA'
const DEBT = '#B45309'
const SETTLED = '#047857'

// the brand header + divider are `fixed` (repeat on every page) AND absolutely positioned - a fixed
// element that relies on normal flow position only reserves that space on the page it was originally
// laid out on, so page 2+ would otherwise render the title/table starting from the very top of the
// page, directly underneath (overlapping) the repeating header. Pinning it with top/left/right and
// giving the Page matching paddingTop is the documented-safe react-pdf pattern - same one already
// used below for the fixed footer.
const HEADER_HEIGHT = 58

const styles = StyleSheet.create({
  page: { paddingTop: 34 + HEADER_HEIGHT, paddingBottom: 46, paddingHorizontal: 34, fontFamily: STATEMENT_FONT, fontSize: 9, color: INK },

  headerFixed: { position: 'absolute', top: 30, left: 34, right: 34 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 16, fontWeight: 'bold', color: ACCENT },
  brandSub: { fontSize: 7, color: MUTED, marginTop: 2, letterSpacing: 0.5 },
  generatedText: { fontSize: 7.5, color: MUTED, textAlign: 'right', maxWidth: 160 },
  divider: { borderBottomWidth: 2, borderBottomColor: ACCENT, marginTop: 10 },

  title: { fontSize: 13.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, letterSpacing: 0.4 },
  subtitle: { fontSize: 9.5, color: MUTED, textAlign: 'center' },
  filterNote: { fontSize: 8, color: MUTED, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },

  metaRow: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 12 },
  metaBox: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 7, borderWidth: 1, borderColor: HAIRLINE, padding: 11 },
  metaLabel: { fontSize: 6.5, color: ACCENT, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 'bold' },
  metaValue: { fontSize: 11, fontWeight: 'bold', color: INK },
  metaSub: { fontSize: 8, color: MUTED, marginTop: 3 },
  verdictLabel: { fontSize: 10.5, fontWeight: 'bold', marginBottom: 3 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: ACCENT_SOFT, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 9 },
  statLabel: { fontSize: 6.5, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, fontWeight: 'bold' },
  statValue: { fontSize: 11.5, fontWeight: 'bold', color: INK },

  table: { borderWidth: 1, borderColor: HAIRLINE, borderRadius: 7 },
  tHeadRow: { flexDirection: 'row', backgroundColor: ACCENT, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  tHeadCell: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold', padding: 7 },
  tRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: HAIRLINE },
  tCell: { fontSize: 8.5, padding: 7 },
  tCellComment: { fontSize: 7, color: MUTED, paddingHorizontal: 7, paddingBottom: 2, fontStyle: 'italic' },
  balanceRow: { flexDirection: 'row', backgroundColor: ACCENT_SOFT, borderTopWidth: 1.5, borderTopColor: ACCENT },
  balanceCell: { fontSize: 9, fontWeight: 'bold', padding: 8 },
  noDataRow: { padding: 16, textAlign: 'center', color: MUTED, fontSize: 9 },

  colDate: { width: '13%' },
  colDesc: { width: '41%' },
  colDebit: { width: '15%', textAlign: 'right' },
  colCredit: { width: '15%', textAlign: 'right' },
  colBalance: { width: '16%', textAlign: 'right' },

  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 46 },
  signBox: { width: '46%' },
  signName: { fontSize: 9.5, fontWeight: 'bold', marginBottom: 28 },
  signLine: { borderTopWidth: 1, borderTopColor: INK },
  signLineLabel: { fontSize: 7, color: MUTED, marginTop: 3 },

  footer: { position: 'absolute', bottom: 18, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: HAIRLINE, paddingTop: 6 },
  footerText: { fontSize: 6.5, color: MUTED, fontStyle: 'italic' },
})

const Money = ({ value, style, color }) => {
  const formatted = formatMoney(value)
  if (formatted === '—') return <Text style={style}>—</Text>
  const digits = formatted.slice(0, -1)
  return (
    <Text style={[style, color ? { color } : null]}>
      {digits}<Text style={{ fontSize: (style?.fontSize || 8.5) - 1.5, fontWeight: 'normal' }}> $</Text>
    </Text>
  )
}

const balanceTone = (value) => (isBalanceSettled(value) ? SETTLED : DEBT)

const StatementPdf = ({ kind, counterparty, dateFrom, dateTo, rows, openingBalance, closingBalance, totalDebit, totalCredit, filterLabel }) => {
  const isSales = kind === 'sales'
  const periodText = dateFrom || dateTo
    ? t('statementPeriodFromTo', { from: dateFrom ? formatDateShort(dateFrom) : '…', to: dateTo ? formatDateShort(dateTo) : '…' })
    : t('allPeriodLabel')
  const debitHeader = isSales ? t('typeSale') : t('typePurchase')
  const creditHeader = t('paidLabel')
  const verdictText = t(closingBalanceLabelKey(isSales, closingBalance))

  return (
    <Document title={`${t('statementDocTitle')} — ${counterparty.name}`}>
      <Page size='A4' style={styles.page} wrap>
        <View style={styles.headerFixed} fixed>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>LasummaShanti</Text>
              <Text style={styles.brandSub}>CRM</Text>
            </View>
            <Text style={styles.generatedText}>{t('statementGeneratedOn', { date: formatDateShort(new Date()) })}</Text>
          </View>
          <View style={styles.divider} />
        </View>

        <Text style={styles.title}>{t('statementDocTitle')}</Text>
        <Text style={styles.subtitle}>{periodText}</Text>
        {filterLabel && <Text style={styles.filterNote}>{filterLabel}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>{isSales ? t('clientLabel') : t('supplierLabel')}</Text>
            <Text style={styles.metaValue}>{counterparty.name}</Text>
            {(counterparty.phone || counterparty.category) && (
              <Text style={styles.metaSub}>{[counterparty.category, counterparty.phone].filter(Boolean).join(' · ')}</Text>
            )}
          </View>
          <View style={styles.metaBox}>
            <Text style={[styles.verdictLabel, { color: balanceTone(closingBalance) }]}>{verdictText}</Text>
            <Money value={closingBalance} style={styles.metaValue} color={balanceTone(closingBalance)} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('openingBalanceLabel')}</Text>
            <Money value={openingBalance} style={styles.statValue} />
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{debitHeader}</Text>
            <Money value={totalDebit} style={styles.statValue} />
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{creditHeader}</Text>
            <Money value={totalCredit} style={styles.statValue} />
          </View>
          <View style={[styles.statBox, { backgroundColor: isBalanceSettled(closingBalance) ? ACCENT_SOFT : '#FEF3E2' }]}>
            <Text style={[styles.statLabel, !isBalanceSettled(closingBalance) ? { color: DEBT } : null]}>{verdictText}</Text>
            <Money value={closingBalance} style={styles.statValue} color={balanceTone(closingBalance)} />
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tHeadCell, styles.colDate]}>{t('dateCol')}</Text>
            <Text style={[styles.tHeadCell, styles.colDesc]}>{t('operationCol')}</Text>
            <Text style={[styles.tHeadCell, styles.colDebit]}>{debitHeader}</Text>
            <Text style={[styles.tHeadCell, styles.colCredit]}>{creditHeader}</Text>
            <Text style={[styles.tHeadCell, styles.colBalance]}>{t('balanceCol')}</Text>
          </View>

          <View style={styles.balanceRow} wrap={false}>
            <Text style={[styles.balanceCell, { width: '54%' }]}>{t('openingBalanceLabel')}</Text>
            <Text style={[styles.balanceCell, styles.colDebit]}>—</Text>
            <Text style={[styles.balanceCell, styles.colCredit]}>—</Text>
            <Money value={openingBalance} style={[styles.balanceCell, styles.colBalance]} />
          </View>

          {rows.length === 0 && <Text style={styles.noDataRow}>{t('noStatementDataYet')}</Text>}

          {rows.map((row, idx) => (
            <View key={idx} wrap={false}>
              <View style={[styles.tRow, idx % 2 === 1 ? { backgroundColor: ROW_ALT } : null]}>
                <Text style={[styles.tCell, styles.colDate]}>{formatDateShort(row.date)}</Text>
                <Text style={[styles.tCell, styles.colDesc]}>{row.description || (row.type === 'payment' ? t('typePayment') : t('typeExpense'))}</Text>
                <Money value={row.debit || null} style={[styles.tCell, styles.colDebit]} />
                <Money value={row.credit || null} style={[styles.tCell, styles.colCredit]} />
                <Money value={row.balance} style={[styles.tCell, styles.colBalance]} />
              </View>
              {row.comment ? (
                <Text style={[styles.tCellComment, idx % 2 === 1 ? { backgroundColor: ROW_ALT } : null]}>{row.comment}</Text>
              ) : null}
            </View>
          ))}

          <View style={styles.balanceRow} wrap={false}>
            <Text style={[styles.balanceCell, { width: '54%', color: balanceTone(closingBalance) }]}>{verdictText}</Text>
            <Money value={totalDebit} style={[styles.balanceCell, styles.colDebit]} />
            <Money value={totalCredit} style={[styles.balanceCell, styles.colCredit]} />
            <Money value={closingBalance} style={[styles.balanceCell, styles.colBalance]} color={balanceTone(closingBalance)} />
          </View>
        </View>

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signBox}>
            <Text style={styles.signName}>LasummaShanti</Text>
            <View style={styles.signLine} />
            <Text style={styles.signLineLabel}>{t('signatureLabel')} · {t('dateCol')}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signName}>{counterparty.name}</Text>
            <View style={styles.signLine} />
            <Text style={styles.signLineLabel}>{t('signatureLabel')} · {t('dateCol')}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{t('statementFooterNote')}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => t('pageOfLabel', { page: pageNumber, total: totalPages })} />
        </View>
      </Page>
    </Document>
  )
}

export default StatementPdf
