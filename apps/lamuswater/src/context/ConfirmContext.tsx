import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLanguage } from './LanguageContext'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmInput = ConfirmOptions | string

interface ConfirmContextType {
  confirm: (input: ConfirmInput) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage()
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback((input: ConfirmInput) => {
    const opts = typeof input === 'string' ? { message: input } : input
    return new Promise<boolean>(resolve => setState({ opts, resolve }))
  }, [])

  const settle = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-[200] p-4 modal-backdrop"
          onClick={() => settle(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl modal-card w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              {state.opts.danger && (
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={17} className="text-red-600" />
                </div>
              )}
              <div>
                {state.opts.title && <h3 className="font-semibold text-gray-900 mb-1">{state.opts.title}</h3>}
                <p className="text-sm text-gray-500 leading-relaxed">{state.opts.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => settle(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {state.opts.cancelLabel || t('common.cancel')}
              </button>
              <button
                onClick={() => settle(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors
                  ${state.opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'}`}
              >
                {state.opts.confirmLabel || t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx.confirm
}
