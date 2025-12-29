### **Testing React + Supabase: Happy Path Guidelines**

#### **Objective**
Verify that React components and hooks behave as expected for the **main user flows**, using mocks to isolate logic from Supabase.

### **1. Scope**
- **Test:**
  - State changes (loading, success, data updates).
  - User interactions (clicks, form submissions).
  - Core rendering (correct UI for loaded/empty states).
- **Skip:**
  - Edge cases (errors, empty responses).
  - Supabase implementation details.

### **2. Mocking Supabase**
- Replace Supabase calls with **minimal mocks** that return realistic happy path data.
- Mock only what the component/hook uses (e.g., `select`, `insert`).

### **3. Test Structure**
- **Components:**
  - Render the component.
  - Simulate user actions.
  - Assert the expected UI/state.
- **Hooks:**
  - Call the hook.
  - Trigger callbacks.
  - Verify state updates.

### **4. Focus**
- **One test per feature**
- **One assertion per behavior**
- **No over-testing** of internal logic or edge cases.

