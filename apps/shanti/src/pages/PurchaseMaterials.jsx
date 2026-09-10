import React, { useContext, useState } from 'react'
import { Plus, Settings, Pencil, X } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'

const PurchaseMaterials = () => {
  const {
    materialCategories, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
    units, createUnit, deleteUnit,
    materials, createMaterial, updateMaterial, deleteMaterial,
  } = useContext(ShantiContext)
  const { t } = useLanguage()

  const [categoryFilter, setCategoryFilter] = useState('')
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#0D9488' })
  const [editingCategory, setEditingCategory] = useState(null)
  const [showManageUnits, setShowManageUnits] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [showNewMaterial, setShowNewMaterial] = useState(false)
  const [newMaterial, setNewMaterial] = useState({ name: '', category: '', unit: '' })
  const [editingMaterial, setEditingMaterial] = useState(null)

  const filteredMaterials = categoryFilter ? materials.filter(m => m.category === categoryFilter) : materials

  const submitNewCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    if (await createMaterialCategory(newCategory)) { setNewCategory({ name: '', color: '#0D9488' }); setAddingCategory(false) }
  }
  const submitEditCategory = async (e) => {
    e.preventDefault()
    if (await updateMaterialCategory(editingCategory._id, { name: editingCategory.name, color: editingCategory.color })) setEditingCategory(null)
  }
  const submitNewUnit = async (e) => {
    e.preventDefault()
    if (!newUnitName.trim()) return
    if (await createUnit({ name: newUnitName.trim() })) setNewUnitName('')
  }
  const submitNewMaterial = async (e) => {
    e.preventDefault()
    if (!newMaterial.name.trim() || !newMaterial.unit) return
    if (await createMaterial(newMaterial)) { setNewMaterial({ name: '', category: '', unit: '' }); setShowNewMaterial(false) }
  }
  const submitEditMaterial = async (e) => {
    e.preventDefault()
    if (await updateMaterial(editingMaterial._id, { name: editingMaterial.name, category: editingMaterial.category, unit: editingMaterial.unit })) setEditingMaterial(null)
  }

  return (
    <div>
      <div className='flex flex-wrap gap-1.5 items-center mb-4'>
        <button onClick={() => setCategoryFilter('')} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${!categoryFilter ? 'bg-accent text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600'}`}>{t('allOption')}</button>
        {materialCategories.map(c => (
          <button key={c._id} onClick={() => setCategoryFilter(c.name)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${categoryFilter === c.name ? 'text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600'}`}
            style={categoryFilter === c.name ? { backgroundColor: c.color } : {}}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setShowManageCategories(true)} title={t('manageCategoriesTitle')}
          className='plain w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100'>
          <Settings size={15} strokeWidth={1.5} />
        </button>
        <button onClick={() => setShowManageUnits(true)} className='ml-auto text-xs text-accent font-medium'>{t('unitsBtn')}</button>
        <button onClick={() => setShowNewMaterial(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('materialLabel')}
        </button>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('itemNameLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('categoryLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('unitLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('stockLabel')}</th>
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(m => (
              editingMaterial?._id === m._id ? (
                <tr key={m._id} className='border-b border-hairline last:border-0'>
                  <td colSpan={5} className='px-4 py-3'>
                    <form onSubmit={submitEditMaterial} className='flex flex-wrap gap-2 items-end'>
                      <input value={editingMaterial.name} onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' required />
                      <Select className='w-40' value={editingMaterial.category} onChange={(v) => setEditingMaterial({ ...editingMaterial, category: v })}
                        options={materialCategories.map(c => ({ value: c.name, label: c.name }))} />
                      <Select className='w-32' value={editingMaterial.unit} onChange={(v) => setEditingMaterial({ ...editingMaterial, unit: v })}
                        options={units.map(u => ({ value: u.name, label: u.name }))} />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
                      <button type='button' onClick={() => setEditingMaterial(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={m._id} className='border-b border-hairline last:border-0'>
                  <td className='px-4 py-3 text-ink'>{m.name}</td>
                  <td className='px-4 py-3 text-muted'>{m.category}</td>
                  <td className='px-4 py-3 text-muted'>{m.unit}</td>
                  <td className='px-4 py-3 font-mono text-ink'>{m.stock}</td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <button onClick={() => setEditingMaterial(m)} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium mr-2'>{t('edit')}</button>
                    <button onClick={() => deleteMaterial(m._id)} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('delete')}</button>
                  </td>
                </tr>
              )
            ))}
            {filteredMaterials.length === 0 && (
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>{t('noMaterialsYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showManageCategories && (
        <Modal title={t('manageCategoriesTitle')} onClose={() => { setShowManageCategories(false); setEditingCategory(null) }}>
          <div className='flex flex-col gap-1.5'>
            {materialCategories.map(c => (
              <div key={c._id} className='flex items-center justify-between text-sm'>
                {editingCategory?._id === c._id ? (
                  <form onSubmit={submitEditCategory} className='flex gap-1.5 items-center flex-1'>
                    <input type='color' value={editingCategory.color} onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })} className='w-7 h-7 rounded flex-shrink-0' />
                    <input autoFocus value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className='flex-1 px-2.5 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                    <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('save')}</button>
                    <button type='button' onClick={() => setEditingCategory(null)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted flex-shrink-0'><X size={14} /></button>
                  </form>
                ) : (
                  <>
                    <span className='flex items-center gap-2 flex-1 min-w-0'>
                      <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: c.color }} />
                      <span className='text-ink truncate'>{c.name}</span>
                    </span>
                    <span className='flex gap-1 flex-shrink-0'>
                      <button onClick={() => setEditingCategory(c)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-accent-soft'>
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      {c.name !== t('otherCategory') && (
                        <button onClick={() => deleteMaterialCategory(c._id)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50'>
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          {addingCategory ? (
            <form onSubmit={submitNewCategory} className='flex gap-1.5 items-center mt-3'>
              <input type='color' value={newCategory.color} onChange={e => setNewCategory({ ...newCategory, color: e.target.value })} className='w-7 h-7 rounded' />
              <input autoFocus placeholder={t('categoryNamePlaceholder')} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
              <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
            </form>
          ) : (
            <button onClick={() => setAddingCategory(true)} className='plain mt-3 text-accent text-sm font-medium flex items-center gap-1'>
              <Plus size={14} strokeWidth={2} /> {t('addCategoryBtn')}
            </button>
          )}
        </Modal>
      )}

      {showManageUnits && (
        <Modal title={t('manageUnitsTitle')} onClose={() => setShowManageUnits(false)}>
          <div className='flex flex-col gap-1.5 mb-3'>
            {units.map(u => (
              <div key={u._id} className='flex items-center justify-between text-sm'>
                <span className='text-ink'>{u.name}</span>
                <button onClick={() => deleteUnit(u._id)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50'>
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={submitNewUnit} className='flex gap-1.5 items-center'>
            <input placeholder={t('unitExamplePlaceholder')} value={newUnitName} onChange={e => setNewUnitName(e.target.value)}
              className='flex-1 px-2.5 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
            <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
          </form>
        </Modal>
      )}

      {showNewMaterial && (
        <Modal title={t('newMaterialTitle')} onClose={() => setShowNewMaterial(false)}>
          <form onSubmit={submitNewMaterial} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('itemNameLabel')}</p>
              <input value={newMaterial.name} onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
              <Select value={newMaterial.category} onChange={(v) => setNewMaterial({ ...newMaterial, category: v })} placeholder={t('otherCategory')}
                options={materialCategories.map(c => ({ value: c.name, label: c.name }))} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('unitLabel')}</p>
              <Select value={newMaterial.unit} onChange={(v) => setNewMaterial({ ...newMaterial, unit: v })} placeholder={t('chooseOption')}
                options={units.map(u => ({ value: u.name, label: u.name }))} />
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2'>{t('add')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default PurchaseMaterials
