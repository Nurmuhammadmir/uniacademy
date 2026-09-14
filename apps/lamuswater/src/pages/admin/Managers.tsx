import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin, type Manager } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Plus, Edit2, Trash2, Users, Package, Truck, X, Check, MapPin } from 'lucide-react'

const ManagerForm = ({ initial, onSave, onClose }: {
  initial?: Partial<Manager>; onSave: (d: any) => void; onClose: () => void
}) => {
  const { t } = useLanguage()
  const isEdit = !!initial?.name
  const [form, setForm] = useState({ name: initial?.name || '', email: initial?.email || '', phone: initial?.phone || '', password: '', role: 'manager' as const })
  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="bg-white rounded-2xl shadow-xl modal-card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{isEdit ? t('managers.editManager') : t('managers.addManager')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {[
            { key: 'name', label: t('common.fullName'), placeholder: 'Timur Rashidov', type: 'text' },
            { key: 'email', label: t('common.email'), placeholder: 'manager@lamus.com', type: 'email' },
            { key: 'phone', label: t('common.phone'), placeholder: '+998 90 111 22 33', type: 'tel' },
            isEdit
              ? { key: 'password', label: t('managers.newPassword'), placeholder: t('managers.newPasswordPlaceholder'), type: 'password' }
              : { key: 'password', label: t('common.password'), placeholder: t('managers.passwordPlaceholder'), type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300
                  focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">{t('common.cancel')}</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors flex items-center justify-center gap-2">
            <Check size={15} /> {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminManagers = () => {
  const { managers, managerLocations, addManager, editManager, removeManager } = useAdmin()
  const { t, fmtDate } = useLanguage()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; manager?: Manager } | null>(null)

  const handleSave = async (data: any) => {
    if (modal?.mode === 'edit' && modal.manager) {
      await editManager(modal.manager._id, data)
    } else {
      await addManager(data)
    }
    setModal(null)
  }

  const handleRemove = async (m: Manager) => {
    const ok = await confirm({
      title: t('confirm.removeManagerTitle'),
      message: t('managers.removeConfirm', { name: m.name }),
      confirmLabel: t('common.confirm'),
      danger: true,
    })
    if (!ok) return
    await removeManager(m._id)
  }

  return (
    <div className="p-6 max-w-4xl">
      {modal && (
        <ManagerForm
          initial={modal.manager}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display text-gray-900">{t('managers.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('managers.subtitle', { count: managers.length })}</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-2 bg-[#0066CC] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors"
        >
          <Plus size={16} /> {t('managers.addManager')}
        </button>
      </div>

      <div className="grid gap-4">
        {managers.map(m => {
          const location = managerLocations.find(l => l.managerId === m._id)
          return (
          <div key={m._id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0066CC]/10 flex items-center justify-center text-[#0066CC] font-semibold text-lg flex-shrink-0">
              {m.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-gray-900 truncate">{m.name}</div>
                <div className="flex items-center gap-1 flex-shrink-0 -mt-1 -mr-1">
                  <button onClick={() => setModal({ mode: 'edit', manager: m })}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleRemove(m)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-400 mt-0.5 truncate">{m.email} · {m.phone}</div>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={12} /> {m.activeClients} {t('managers.clients')}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Truck size={12} /> {m.totalDeliveries} {t('managers.deliveries')}
                </div>
                <div className="text-xs text-gray-400">
                  {t('common.since', { date: fmtDate(m.joinedAt, { month: 'short', year: 'numeric' }) })}
                </div>
                <div className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  m.totalDeliveries >= 70 ? 'bg-green-100 text-green-700' :
                  m.totalDeliveries >= 30 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.totalDeliveries >= 70 ? t('managers.topPerformer') : m.totalDeliveries >= 30 ? t('managers.active') : t('managers.new')}
                </div>
                {location && (
                  <button
                    onClick={() => navigate('/dashboard/map')}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0066CC] transition-colors"
                  >
                    <MapPin size={12} />
                    {t('map.lastSeen', { time: fmtDate(location.updatedAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
                  </button>
                )}
              </div>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminManagers
