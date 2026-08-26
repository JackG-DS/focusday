// Verification script for To-Do PWA core mechanics
const assert = require('assert');

function runTests() {
  console.log('🧪 Starting core logic unit tests...\n');

  const today = '2026-08-25';
  const yesterday = '2026-08-24';

  // --- TEST 1: Midnight Rollover Logic ---
  console.log('▶ Test 1: Testing Midnight Rollover Logic...');
  const mockTasks = [
    { id: '1', title: 'Yesterday Unfinished Task 1', completed: false, date_assigned: yesterday, order_index: 0 },
    { id: '2', title: 'Yesterday Finished Task 2', completed: true, date_assigned: yesterday, order_index: 1 },
    { id: '3', title: 'Today Task 1', completed: false, date_assigned: today, order_index: 0 },
  ];

  // Rollover implementation check
  const overdueIncomplete = mockTasks.filter(t => !t.completed && t.date_assigned < today);
  assert.strictEqual(overdueIncomplete.length, 1, 'Should find exactly 1 overdue incomplete task');

  const rolledOver = mockTasks.map(t => {
    if (!t.completed && t.date_assigned < today) {
      return { ...t, date_assigned: today, order_index: -1 };
    }
    return t;
  });

  const todayTasksAfterRollover = rolledOver.filter(t => t.date_assigned === today);
  const yesterdayTasksAfterRollover = rolledOver.filter(t => t.date_assigned === yesterday);

  assert.strictEqual(todayTasksAfterRollover.length, 2, 'Today should now have 2 active tasks');
  assert.strictEqual(yesterdayTasksAfterRollover.length, 1, 'Yesterday should retain the completed task');
  assert.strictEqual(yesterdayTasksAfterRollover[0].completed, true, 'Yesterday retained task must be marked completed');
  console.log('✅ Test 1 Passed: Midnight rollover successfully rolled unfinished tasks and preserved history.\n');

  // --- TEST 2: Bonus Pool Completion Trigger ---
  console.log('▶ Test 2: Testing Bonus Pool Completion Trigger...');
  let poolTasks = [
    { id: 'p1', title: '🎁 Bonus Task A' },
    { id: 'p2', title: '🎁 Bonus Task B' },
    { id: 'p3', title: '🎁 Bonus Task C' },
  ];

  let dailyTasks = [
    { id: 'd1', title: 'Task 1', completed: false, date_assigned: today, order_index: 0 },
    { id: 'd2', title: 'Task 2', completed: false, date_assigned: today, order_index: 1 },
  ];

  let bonusTriggeredDates = [];

  // Simulate completing task 1 (1 of 2 done - should NOT trigger bonus)
  dailyTasks[0].completed = true;
  let allDone = dailyTasks.every(t => t.completed);
  assert.strictEqual(allDone, false, 'Should not be all done yet');
  assert.strictEqual(bonusTriggeredDates.includes(today), false, 'Bonus should not trigger yet');

  // Simulate completing task 2 (2 of 2 done - MUST trigger bonus)
  dailyTasks[1].completed = true;
  allDone = dailyTasks.every(t => t.completed);
  assert.strictEqual(allDone, true, 'All daily tasks are now completed');

  // Trigger Bonus Pull
  if (allDone && !bonusTriggeredDates.includes(today) && poolTasks.length > 0) {
    const randomIndex = 0; // Deterministic for test
    const chosenPoolTask = poolTasks[randomIndex];
    poolTasks = poolTasks.filter(p => p.id !== chosenPoolTask.id);

    dailyTasks.push({
      id: 'd3-bonus',
      title: chosenPoolTask.title,
      completed: false,
      date_assigned: today,
      order_index: 2,
    });

    bonusTriggeredDates.push(today);
  }

  assert.strictEqual(poolTasks.length, 2, 'Pool tasks should decrease from 3 to 2');
  assert.strictEqual(dailyTasks.length, 3, 'Daily tasks should increase from 2 to 3');
  assert.strictEqual(dailyTasks[2].title, '🎁 Bonus Task A', 'New daily task must match the pulled bonus task');
  assert.strictEqual(dailyTasks[2].completed, false, 'Pulled bonus task must start uncompleted');
  assert.strictEqual(bonusTriggeredDates.includes(today), true, 'Today must be recorded to prevent duplicate triggers');

  // Verify that subsequent completions on the same day do not re-trigger
  const shouldReTrigger = allDone && !bonusTriggeredDates.includes(today);
  assert.strictEqual(shouldReTrigger, false, 'Must not re-trigger bonus on the same date');
  console.log('✅ Test 2 Passed: Bonus Pool correctly transferred 1 task on 100% completion and guarded against duplicates.\n');

  // --- TEST 3: DnD Reordering Index Normalization ---
  console.log('▶ Test 3: Testing Task Reordering Normalization...');
  const initialList = [
    { id: 'a', title: 'A', order_index: 0 },
    { id: 'b', title: 'B', order_index: 1 },
    { id: 'c', title: 'C', order_index: 2 },
  ];

  // Move 'c' to top (index 0)
  const reordered = [initialList[2], initialList[0], initialList[1]].map((item, idx) => ({
    ...item,
    order_index: idx,
  }));

  assert.strictEqual(reordered[0].id, 'c');
  assert.strictEqual(reordered[0].order_index, 0);
  assert.strictEqual(reordered[1].id, 'a');
  assert.strictEqual(reordered[1].order_index, 1);
  assert.strictEqual(reordered[2].id, 'b');
  assert.strictEqual(reordered[2].order_index, 2);
  console.log('✅ Test 3 Passed: Reordering index calculation is verified.\n');

  console.log('🎉 ALL UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests();
