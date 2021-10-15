import { iterableStringInterceptor } from "iterable-string-interceptor";

export async function * keyValueTransformer(source,updates) {

    for await (const chunk of iterableStringInterceptor(
        source,
        expression => properties[expression]
      )) {
          yield chunk;
      }
)