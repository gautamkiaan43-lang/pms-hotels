(async () => {
  try {
    console.log('Loading @xenova/transformers...');
    const { pipeline: p } = await import("@xenova/transformers");
    console.log('Loading Xenova/bge-large-en-v1.5 model...');
    const pipeline = await p("feature-extraction", "Xenova/bge-large-en-v1.5");
    console.log('Model loaded successfully! Generating embedding...');
    const result = await pipeline("Hello, hotel policies!", { pooling: "mean", normalize: true });
    const vector = Array.from(result.data);
    console.log('✅ Generated vector with dimensions:', vector.length);
    console.log('✅ First 5 values:', vector.slice(0, 5));
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
})();
