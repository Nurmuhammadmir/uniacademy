import LeadSource from "../models/LeadSource.js"

// seeded once per branch on first use - matches the fixed source list this feature originally
// shipped with, kept as sensible defaults now that the list is admin-manageable
export const DEFAULT_LEAD_SOURCES = [
    { name: 'Instagram', color: '#D6497A' },
    { name: 'Telegram', color: '#3E7CB1' },
    { name: 'Referral', color: '#2E8B57' },
    { name: 'Walk-in', color: '#B7950B' },
    { name: 'Call', color: '#8E44AD' },
    { name: 'Other', color: '#7A7266' },
]

export const ensureDefaultLeadSources = async (branchId) => {
    const existing = await LeadSource.countDocuments({ branchId })
    if (existing > 0) return
    try {
        await LeadSource.insertMany(DEFAULT_LEAD_SOURCES.map(s => ({ branchId, ...s })), { ordered: false })
    } catch (error) {
        // a concurrent request seeding the same branch at the same time is a harmless race
        if (error.code !== 11000 && !error.writeErrors) throw error
    }
}
