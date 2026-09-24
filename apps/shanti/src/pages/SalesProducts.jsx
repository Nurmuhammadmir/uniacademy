import React, { useContext, useRef, useState } from 'react'
import { Plus, PackagePlus, Camera, X, Package } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { confirm } from '../lib/confirm.js'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import NumberInput from '../components/NumberInput.jsx'
import Spinner from '../components/Spinner.jsx'
import Money from '../components/Money.jsx'

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

// `url` is a relative path (e.g. /static/images/shanti-products/<id>.jpg) served by the BACKEND,
// not this frontend's own origin - the browser would otherwise resolve a bare <img src="/static/...">
// against shanti.uniacademy.uz itself (getting the SPA's index.html back, hence a broken-image icon)
// instead of backend.uniacademy.uz where the file actually lives.
const Thumb = ({ url, size }) => {
  const { backendUrl } = useContext(ShantiContext)
  const fullUrl = url ? (/^https?:\/\//.test(url) ? url : backendUrl + url) : null
  return (
    <span className={`${size} rounded-xl bg-bg flex items-center justify-center overflow-hidden flex-shrink-0 border border-hairline`}>
      {fullUrl ? <img src={fullUrl} alt='' loading='lazy' className='w-full h-full object-cover' /> : <Package size={size === 'w-20 h-20' ? 24 : 18} className='text-muted' strokeWidth={1.5} />}
    </span>
  )
}

const emptyRecipeLine = () => ({ materialId: '', quantity: '' })

// mounted ONLY while its card is expanded (see ProductCard below) - every field here initializes
// fresh from the current `product` prop each time it mounts, so re-opening a card after a save (or
// after another tab refetched the list) never shows stale edit-form values left over from a
// previous open. Collapsing the card unmounts this and discards any unsaved edits, same as closing
// any other unsaved form. No stock field here: stock only ever moves through sales/restocks/
// production, by design - same reasoning as MaterialEditPanel in PurchaseMaterials.jsx.
const ProductEditPanel = ({ product, onClose }) => {
  const { materials, units, updateProduct, deleteProduct, uploadProductPhoto, deleteProductPhoto } = useContext(ShantiContext)
  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({ name: product.name, unit: product.unit, price: String(product.price) })
  const [recipe, setRecipe] = useState((product.materialsUsed || []).map(m => ({ materialId: m.materialId, quantity: String(m.quantity) })))
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const setRecipeLine = (idx, patch) => setRecipe(list => list.map((line, i) => i === idx ? { ...line, ...patch } : line))
  const addRecipeLine = () => setRecipe(list => [...list, emptyRecipeLine()])
  const removeRecipeLine = (idx) => setRecipe(list => list.filter((_, i) => i !== idx))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const validRecipe = recipe.filter(r => r.materialId && Number(r.quantity) > 0)
    const ok = await updateProduct(product._id, {
      name: form.name, unit: form.unit, price: Number(form.price) || 0,
      materialsUsed: validRecipe.map(r => ({ materialId: r.materialId, quantity: Number(r.quantity) })),
    })
    setSaving(false)
    if (ok) onClose()
  }

  const handleDelete = async () => {
    if (!(await confirm(t('areYouSure')))) return
    await deleteProduct(product._id)
  }

  const handlePhotoPick = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploadingPhoto(true)
    await uploadProductPhoto(product._id, file)
    setUploadingPhoto(false)
  }

  return (
    <div className='flex flex-col gap-3.5'>
      <div className='flex items-center gap-3'>
        <Thumb url={product.imageUrl} size='w-20 h-20' />
        <div className='flex flex-col gap-1.5'>
          <input ref={fileInputRef} type='file' accept='image/*' onChange={handlePhotoPick} className='hidden' />
          <button type='button' onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
            className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium flex items-center gap-1.5 disabled:opacity-50'>
            {uploadingPhoto ? <Spinner size={12} /> : <Camera size={13} strokeWidth={1.75} />} {product.imageUrl ? t('changePhotoLabel') : t('addPhotoLabel')}
          </button>
          {product.imageUrl && (
            <button type='button' onClick={() => deleteProductPhoto(product._id)} className='px-3 py-1.5 rounded-lg text-muted text-xs font-medium text-left'>{t('removePhotoLabel')}</button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className='flex flex-col gap-3'>
        <p className='text-xs text-muted'>{t('stockLabel')}: <span className='font-mono font-semibold text-ink'>{product.stock} {product.unit}</span></p>
        <div className='grid grid-cols-2 gap-2.5'>
          <div className='col-span-2'>
            <p className='text-xs text-muted mb-1'>{t('itemNameLabel')}</p>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className='w-full px-2.5 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('unitLabel')}</p>
            <Select value={form.unit} onChange={v => setForm({ ...form, unit: v })} options={units.map(u => ({ value: u.name, label: u.name }))} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('priceLabel')}</p>
            <NumberInput value={form.price} onChange={v => setForm({ ...form, price: v })} className='w-full px-2.5 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
        </div>

        <div>
          <p className='text-xs text-muted mb-1.5'>{t('materialsUsedLabel')}</p>
          <div className='flex flex-col gap-1.5'>
            {recipe.map((line, idx) => (
              <div key={idx} className='flex gap-1.5 items-center'>
                <Select forceSearch className='flex-1 min-w-0' value={line.materialId} onChange={v => setRecipeLine(idx, { materialId: v })}
                  placeholder={t('chooseMaterialPlaceholder')}
                  options={materials.map(m => ({ value: m._id, label: `${m.name} (${m.unit})` }))} />
                <NumberInput value={line.quantity} onChange={v => setRecipeLine(idx, { quantity: v })} placeholder={t('quantityLabel')} className='w-16 sm:w-20 flex-shrink-0 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                <button type='button' onClick={() => removeRecipeLine(idx)} className='plain w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 flex-shrink-0'>
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
            {recipe.length === 0 && <p className='text-muted text-xs'>{t('noMaterialsUsedYet')}</p>}
          </div>
          <button type='button' onClick={addRecipeLine} className='plain text-accent text-xs font-medium flex items-center gap-1 mt-1.5'>
            <Plus size={13} strokeWidth={2} /> {t('addMaterialRowBtn')}
          </button>
          {recipe.length > 0 && <p className='text-muted text-[11px] mt-1.5'>{t('materialsAutoDeductedHint')}</p>}
        </div>

        <div className='flex gap-2 mt-1'>
          <button type='submit' disabled={saving} className='flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50'>
            {saving && <Spinner size={13} />} {t('save')}
          </button>
          <button type='button' onClick={onClose} className='px-4 py-2 rounded-xl bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
          <button type='button' onClick={handleDelete} className='px-4 py-2 rounded-xl bg-bg border border-hairline text-rose-600 text-sm font-medium'>{t('delete')}</button>
        </div>
      </form>
    </div>
  )
}

// a click anywhere on the card opens its editor in a popup (Modal), not inline - the catalog is
// small enough that a bare table felt heavier than it needed to be, and Edit/Delete sitting exposed
// on every row at all times was more chrome than a handful of products calls for. The popup's own
// ProductEditPanel only mounts (and only then loads material/recipe editing state) while open, and
// photos are already tiny (resized+compressed server-side, see shantiUploadController.js) and
// lazy-loaded, so opening/closing the popup costs nothing extra on the server.
const ProductCard = ({ product, onOpen }) => (
  <button type='button' onClick={onOpen}
    className='plain bg-bg-elevated border border-hairline rounded-2xl shadow-sm hover:shadow-md transition-shadow w-full flex items-center gap-3 p-3 text-left'>
    <Thumb url={product.imageUrl} size='w-12 h-12' />
    <span className='flex-1 min-w-0'>
      <p className='text-ink font-medium text-sm truncate'>{product.name}</p>
      <p className='text-muted text-xs font-mono mt-0.5'><Money value={product.price} /> · {product.stock} {product.unit}</p>
    </span>
  </button>
)

const SalesProducts = () => {
  const { units, products, createProduct } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [showNew, setShowNew] = useState(false)
  const [showRestock, setShowRestock] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [newProduct, setNewProduct] = useState({ name: '', unit: '', price: '', stock: '' })
  const openProduct = products.find(p => p._id === openId)

  const submitNewProduct = async (e) => {
    e.preventDefault()
    if (!newProduct.name.trim() || !newProduct.unit) return
    const ok = await createProduct({ ...newProduct, price: Number(newProduct.price) || 0, stock: Number(newProduct.stock) || 0 })
    if (ok) { setNewProduct({ name: '', unit: '', price: '', stock: '' }); setShowNew(false) }
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

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
        {products.map(p => (
          <ProductCard key={p._id} product={p} onOpen={() => setOpenId(p._id)} />
        ))}
        {products.length === 0 && <p className='text-muted text-sm col-span-full text-center py-8'>{t('noProductsYet')}</p>}
      </div>

      {openProduct && (
        <Modal title={openProduct.name} onClose={() => setOpenId(null)} wide>
          <ProductEditPanel product={openProduct} onClose={() => setOpenId(null)} />
        </Modal>
      )}

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
