export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 10000,
  message = "Sunucu yanıtı gecikti. Lütfen tekrar dene."
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}
