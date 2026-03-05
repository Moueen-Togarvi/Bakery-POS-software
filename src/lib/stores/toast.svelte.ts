export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

let toasts = $state<Toast[]>([]);

export const toastStore = {
    get toasts() { return toasts; },

    add(message: string, type: ToastType = 'success', duration = 3000) {
        const id = Math.random().toString(36).substring(2, 9);
        toasts.push({ id, message, type });

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
        return id;
    },

    remove(id: string) {
        const index = toasts.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.splice(index, 1);
        }
    },

    success(message: string, duration?: number) { return this.add(message, 'success', duration); },
    error(message: string, duration?: number) { return this.add(message, 'error', duration); },
    info(message: string, duration?: number) { return this.add(message, 'info', duration); }
};
