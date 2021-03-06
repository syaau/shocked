import { TYPE_TRACKER_INIT } from './initStore';
import { TYPE_BATCH_ACTIONS } from './batchActions';

export default function enhanceReduce(reducer) {
  return function enhancedReducer(state = null, action) {
    if (action.type === TYPE_BATCH_ACTIONS) {
      return action.payload.reduce(enhancedReducer, state);
    }

    const result = reducer(state, action);

    // Special case, if the tracker init isn't handled by the reducer
    // handle it by default
    if (action.type === TYPE_TRACKER_INIT && result === state) {
      return action.payload;
    }

    return result;
  };
}
