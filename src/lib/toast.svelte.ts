/** Tiny snackbar store. */
let nextId = 0;

class Toasts {
  items = $state<{ id: number; text: string }[]>([]);

  show(text: string, ms = 3000) {
    const id = nextId++;
    this.items.push({ id, text });
    setTimeout(() => {
      this.items = this.items.filter((t) => t.id !== id);
    }, ms);
  }
}

export const toasts = new Toasts();
