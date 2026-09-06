import React, { useContext, useState } from 'react'
import { Plus } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import { formatMoney } from '../lib/format.js'

const SalesProducts = () => {
  const { units, products, createProduct, updateProduct, deleteProduct } = useContext(ShantiContext)
  const [showNew, setShowNew] = useState(false)
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
      <div className='flex justify-end mb-4'>
        <button onClick={() => setShowNew(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> Товар
        </button>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>Название</th>
              <th className='px-4 py-3 font-medium'>Ед. измерения</th>
              <th className='px-4 py-3 font-medium'>Цена</th>
              <th className='px-4 py-3 font-medium'>На складе</th>
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
                      <input type='number' value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} className='w-28 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' placeholder='Цена' />
                      <input type='number' value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} className='w-28 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' placeholder='Остаток' />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>Сохранить</button>
                      <button type='button' onClick={() => setEditingProduct(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>Отмена</button>
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
                    <button onClick={() => setEditingProduct(p)} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium mr-2'>Изменить</button>
                    <button onClick={() => deleteProduct(p._id)} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>Удалить</button>
                  </td>
                </tr>
              )
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>Товаров пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <Modal title='Новый товар' onClose={() => setShowNew(false)}>
          <form onSubmit={submitNewProduct} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>Название</p>
              <input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>Единица измерения</p>
              <Select value={newProduct.unit} onChange={(v) => setNewProduct({ ...newProduct, unit: v })} placeholder='Выберите'
                options={units.map(u => ({ value: u.name, label: u.name }))} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>Цена продажи (по умолчанию для новой продажи)</p>
              <input type='number' value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>Начальный остаток на складе</p>
              <input type='number' value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2'>Добавить</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default SalesProducts
