use crate::framework::event_types::{CorrelationId, ExecuteAt, DateTime};

pub struct SendWelcomeEmail {
    pub correlation_id: CorrelationId,           // Required framework type for tracing
    pub user_id: String,                         // Required business data
    pub email: String,                           // Required business data
    pub name: String,                            // Required business data
    pub execute_at: Option<ExecuteAt<DateTime>>, // Optional - framework uses now() if None
    pub template_vars: Option<std::collections::HashMap<String, String>>, // Optional customization
}

