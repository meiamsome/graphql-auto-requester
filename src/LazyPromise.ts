
class LazyPromise<T> implements PromiseLike<T> {
  promise: Promise<T> | null
  initializer: () => Promise<T> | T

  constructor (initializer: () => Promise<T> | T) {
    this.initializer = initializer
    this.promise = null
  }

  then<TResult1 = T, TResult2 = never> (
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2> {
    if (!this.promise) {
      this.promise = Promise.resolve()
        .then(this.initializer)
    }
    return this.promise.then(onfulfilled, onrejected)
  }
}

export default LazyPromise
