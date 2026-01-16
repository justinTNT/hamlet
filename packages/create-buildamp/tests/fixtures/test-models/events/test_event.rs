
use crate::framework::event_types::{CorrelationId, ExecuteAt, DateTime};

pub struct TestEvent {
    pub correlation_id: CorrelationId,
    pub message: String,
    pub execute_at: Option<ExecuteAt<DateTime>>,
}
