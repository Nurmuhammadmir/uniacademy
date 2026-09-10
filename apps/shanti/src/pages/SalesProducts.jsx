import React, { useContext, useState } from 'react'
import { Plus, PackagePlus } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import NumberInput from '../components/NumberInput.jsx'
import Spinner from '../components/Spinner.jsx'
import { formatMoney } from '../lib/format.js'

const RestockProductModal = ({ onClose }) => {
  const { products, restockProduct } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const selectedProduct = products.find(p => p._id === productId)

  const submit = async (e) => {
    e.preventDefault()
    if (!productId || !(Number(quantity) > 0)) return
    setSubmitting(true)
    const ok = await restockProduct(productId, { quantity: Number(quantity), comment })
    setSubmitting(false)
    if (ok) onClose()
  }

  return (
    <Modal title={t('restockProductTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('productLabel')}</p>
          <Select forceSearch value={productId} onChange={setProductId} placeholder={t('chooseProductPlaceholder')}
            options={products.map(p => ({ value: p._id, label: `${p.name} · ${t('stockLabel')} ${p.stock} ${p.unit}` }))} />
        </div>
        {selectedProduct && (
          <p className='text-xs text-muted'>{t('stockLabel')}: <span className='font-mono font-semibold text-ink'>{selectedProduct.stock} {selectedProduct.unit}</span></p>
        )}
        <div>
          <p className='text-xs text-muted mb-1'>{t('quantityToAddLabel')}</p>
          <NumberInput value={quantity} onChange={setQuantity} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <input value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <button type='submit' disabled={submitting || !productId || !(Number(quantity) > 0)}
          className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {t('restockBtn')}
        </button>
      </form>
    </Modal>
  )
}

const SalesProducts = () => {
  const { units, products, createProduct, updateProduct, deleteProduct } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [showNew, setShowNew] = useState(false)
  const [showRestock, setShowRestock] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', unit: '', price: '', stock: '' })
  const [editingProduct, setEditingProduct] = useState(null)

  const submitNewProduct = async (e) => {
    e.preventDefault()
    if (!newProduct.name.trim() || !newProduct.unit) return
    const ok = await createProduct({ ...newProduct, price: Number(newProduct.price) || 0, stock: Number(newProduct.stock) || 0 })
    if (ok) { setNewProduct({ name: '', unit: '', price: '', stock: '' }); setShowNew(false) }
  }
  const submitEditProduct = async (e) => {
    e.preventDefault()
    const ok = await updateProduct(editingProduct._id, { name: editingProduct.name, unit: editingProduct.unit, price: Number(editingProduct.price), stock: Number(editingProduct.stock) })
    if (ok) setEditingProduct(null)
  }

  return (
    <div>
      <div className='flex justify-end gap-2 mb-4'>
        <button onClick={() => setShowRestock(true)} className='px-4 py-2 rounded-xl bg-accent-soft text-accent text-sm font-medium flex items-center gap-1.5'>
          <PackagePlus size={15} strokeWidth={1.75} /> {t('restockProductBtn')}
        </button>
        <button onClick={() => setShowNew(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('productLabel')}
        </button>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('itemNameLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('unitLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('priceLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('stockLabel')}</th>
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              editingProduct?._id === p._id ? (
                <tr key={p._id} className='border-b border-hairline last:border-0'>
                  <td colSpan={5} className='px-4 py-3'>
                    <form onSubmit={submitEditProduct} className='flex flex-wrap gap-2 items-end'>
                      <input value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' required />
                      <Select className='w-32' value={editingProduct.unit} onChange={(v) => setEditingProduct({ ...editingProduct, unit: v })}
                        options={units.map(u => ({ value: u.name, label: u.name }))} />
                      <NumberInput value={editingProduct.price} onChange={v => setEditingProduct({ ...editingProduct, price: v })} className='w-28 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' placeholder={t('priceLabel')} />
                      <NumberInput value={editingProduct.stock} onChange={v => setEditingProduct({ ...editingProduct, stock: v })} className='w-28 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' placeholder={t('stockLabel')} />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
                      <button type='button' onClick={() => setEditingProduct(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={p._id} className='border-b border-hairline last:border-0'>
                  <td className='px-4 py-3 text-ink'>{p.name}</td>
                  <td className='px-4 py-3 text-muted'>{p.unit}</td>
                  <td className='px-4 py-3 font-mono text-ink'>{formatMoney(p.price)}</td>
                  <td className='px-4 py-3 font-mono text-ink'>{p.stock}</td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <button onClick={() => setEditingProduct(p)} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium mr-2'>{t('edit')}</button>
                    <button onClick={() => deleteProduct(p._id)} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('delete')}</button>
                  </td>
                </tr>
              )
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>{t('noProductsYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <Modal title={t('newProductTitle')} onClose={() => setShowNew(false)}>
          <form onSubmit={submitNewProduct} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('itemNameLabel')}</p>
              <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('unitLabel')}</p>
              <Select value={newProduct.unit} onChange={(v) => setNewProduct({ ...newProduct, unit: v })} placeholder={t('chooseOption')}
                options={units.map(u => ({ value: u.name, label: u.name }))} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('salePriceDefaultLabel')}</p>
              <NumberInput value={newProduct.price} onChange={v => setNewProduct({ ...newProduct, price: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('initialStockLabel')}</p>
              <NumberInput value={newProduct.stock} onChange={v => setNewProduct({ ...newProduct, stock: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2'>{t('add')}</button>
          </form>
        </Modal>
      )}

      {showRestock && <RestockProductModal onClose={() => setShowRestock(false)} />}
    </div>
  )
}

export default SalesProducts
