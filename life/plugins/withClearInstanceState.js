const { withMainActivity } = require('@expo/config-plugins');

/**
 * Overrides onSaveInstanceState to clear the bundle before it's sent over
 * Android Binder IPC. Without this, React Navigation state + RN bridge state
 * can exceed the ~1-4MB Binder limit, causing TransactionTooLargeException
 * when the activity stops (goes to background).
 */
module.exports = function withClearInstanceState(config) {
  return withMainActivity(config, (mod) => {
    let src = mod.modResults.contents;

    if (!src.includes('onSaveInstanceState')) {
      const override = [
        '',
        '  override fun onSaveInstanceState(outState: android.os.Bundle) {',
        '    super.onSaveInstanceState(outState)',
        '    outState.clear()',
        '  }',
        '',
      ].join('\n');

      const lastBrace = src.lastIndexOf('}');
      src = src.slice(0, lastBrace) + override + src.slice(lastBrace);
    }

    mod.modResults.contents = src;
    return mod;
  });
};
