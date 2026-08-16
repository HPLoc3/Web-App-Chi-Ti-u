import { AppState, FinancialInsight } from '../types';
import { CATEGORIES } from '../constants/categories';
import { formatVND } from './format';

export function generateFinancialInsights(state: AppState): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const { expenses, income, categoryLimits, goals, recurringExpenses } = state;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const currentDay = Math.max(1, today.getDate());
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

  // Previous month string
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = prevDate.toISOString().slice(0, 7);

  const currentExpenses = expenses.filter((e) => e.date && e.date.startsWith(currentMonthStr));
  const prevExpenses = expenses.filter((e) => e.date && e.date.startsWith(prevMonthStr));

  const totalCurrent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPrev = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Overall Income vs Expense & Savings Rate
  const netSavings = Math.max(0, income - totalCurrent);
  const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
  const projectedMonthEndTotal = currentDay > 0 ? Math.round((totalCurrent / currentDay) * totalDaysInMonth) : totalCurrent;

  if (totalCurrent > income && income > 0) {
    const deficit = totalCurrent - income;
    const dailyReduction = Math.round(deficit / daysRemaining);
    insights.push({
      id: 'ins-overbudget-total',
      title: 'Báo động thâm hụt ngân sách tháng',
      message: `Tổng chi tiêu tháng này (${formatVND(totalCurrent)}) đã vượt quá tổng thu nhập (${formatVND(income)}).`,
      severity: 'critical',
      metricLabel: 'Tỷ lệ chi/thu',
      metricValue: `${Math.round((totalCurrent / income) * 100)}%`,
      observation: `Tổng chi tiêu hiện tại đã thâm hụt ${formatVND(deficit)} so với thu nhập tháng.`,
      projection: `Nếu tiếp tục phát sinh chi tiêu, mức thâm hụt có thể lên tới ${formatVND(projectedMonthEndTotal - income)} vào cuối tháng.`,
      suggestedAction: `Dừng mọi khoản chi tiêu không bắt buộc. Giới hạn chi tiêu mỗi ngày dưới ${formatVND(Math.max(0, Math.round((income * 0.9 - totalCurrent) / daysRemaining)))} để ổn định dòng tiền.`,
      dailyImpact: `Cần thắt chặt ${formatVND(dailyReduction)}/ngày`,
      targetTab: 'budget',
      actionableStep: 'Cắt giảm các khoản chi tiêu không thiết yếu ngay lập tức.',
    });
  } else if (projectedMonthEndTotal > income && income > 0) {
    const projectedDeficit = projectedMonthEndTotal - income;
    const neededDailyReduction = Math.round(projectedDeficit / daysRemaining);
    insights.push({
      id: 'ins-pace-warning',
      title: 'Tốc độ chi tiêu có nguy cơ vượt thu nhập',
      message: `Với tốc độ chi ${formatVND(Math.round(totalCurrent / currentDay))}/ngày, bạn có nguy cơ bội chi vào cuối tháng.`,
      severity: 'warning',
      metricLabel: 'Dự báo cuối tháng',
      metricValue: formatVND(projectedMonthEndTotal),
      observation: `Bạn đã tiêu ${formatVND(totalCurrent)} trong ${currentDay} ngày đầu tháng (${Math.round((totalCurrent / income) * 100)}% thu nhập).`,
      projection: `Nếu giữ tốc độ này, bạn sẽ vượt thu nhập khoảng ${formatVND(projectedDeficit)} vào ngày ${totalDaysInMonth}.`,
      suggestedAction: `Giảm khoảng ${formatVND(neededDailyReduction)}/ngày trong ${daysRemaining} ngày tới để giữ ngân sách an toàn.`,
      dailyImpact: `Giảm ${formatVND(neededDailyReduction)}/ngày`,
      targetTab: 'budget',
      actionableStep: `Giảm khoảng ${formatVND(neededDailyReduction)}/ngày để quay về ngưỡng an toàn.`,
    });
  } else if (savingsRate >= 25 && income > 0) {
    const surplusInvestable = Math.round(netSavings * 0.6);
    insights.push({
      id: 'ins-savings-good',
      title: 'Tỷ lệ tích lũy xuất sắc (>= 25%)',
      message: `Tỷ lệ tiết kiệm tháng này đạt ${Math.round(savingsRate)}%, vượt chuẩn tối ưu của quy tắc tài chính cá nhân.`,
      severity: 'positive',
      metricLabel: 'Tích lũy ròng',
      metricValue: formatVND(netSavings),
      observation: `Bạn đang giữ tỷ lệ tiết kiệm ${Math.round(savingsRate)}% với thặng dư khả dụng ${formatVND(netSavings)}.`,
      projection: `Nếu duy trì kỷ luật này, bạn sẽ tích lũy được thêm ${formatVND(netSavings * 6)} trong 6 tháng tới.`,
      suggestedAction: `Chuyển ngay ${formatVND(surplusInvestable)} vào Mục tiêu tích lũy hoặc quỹ đầu tư khẩn cấp trước khi bị phân tán.`,
      dailyImpact: `Thặng dư ${formatVND(Math.round(netSavings / totalDaysInMonth))}/ngày`,
      targetTab: 'goals',
      actionableStep: 'Xem xét phân bổ số tiền nhàn rỗi này vào các mục tiêu dài hạn.',
    });
  } else if (income > 0 && savingsRate < 15) {
    const targetSavings = income * 0.2;
    const gap = targetSavings - netSavings;
    const dailySavingBoost = Math.round(gap / daysRemaining);
    insights.push({
      id: 'ins-savings-low',
      title: 'Tỷ lệ tích lũy chưa đạt chuẩn 20%',
      message: `Bạn mới tích lũy được ${Math.round(savingsRate)}% thu nhập. Chuẩn khuyến nghị là tối thiểu 20%.`,
      severity: 'warning',
      metricLabel: 'Tỷ lệ hiện tại',
      metricValue: `${Math.round(savingsRate)}%`,
      observation: `Thặng dư tích lũy hiện đạt ${formatVND(netSavings)}, thấp hơn mức mục tiêu 20% (${formatVND(targetSavings)}).`,
      projection: `Nếu không điều chỉnh, bạn sẽ thiếu hụt khoảng ${formatVND(gap)} so với kế hoạch tích lũy năm.`,
      suggestedAction: `Tiết kiệm thêm khoảng ${formatVND(dailySavingBoost)}/ngày trong các khoản linh hoạt để đưa tỷ lệ tích lũy lên chuẩn 20%.`,
      dailyImpact: `Cần tối ưu ${formatVND(dailySavingBoost)}/ngày`,
      targetTab: 'budget',
      actionableStep: 'Xem xét áp dụng quy tắc 50/30/20 để tự động trích lập quỹ dự phòng.',
    });
  }

  // 2. Category Level Spending Limits & Month-over-Month Comparison
  const currentCatTotals: Record<string, number> = {};
  currentExpenses.forEach((e) => {
    currentCatTotals[e.categoryId] = (currentCatTotals[e.categoryId] || 0) + e.amount;
  });

  const prevCatTotals: Record<string, number> = {};
  prevExpenses.forEach((e) => {
    prevCatTotals[e.categoryId] = (prevCatTotals[e.categoryId] || 0) + e.amount;
  });

  // Check category limit overshoots
  Object.entries(categoryLimits).forEach(([catId, limit]) => {
    const catTotal = currentCatTotals[catId] || 0;
    const catObj = CATEGORIES.find((c) => c.id === catId);
    const catName = catObj?.name || catId;

    if (limit > 0 && catTotal > limit) {
      const excess = catTotal - limit;
      const pctOver = Math.round((excess / limit) * 100);
      const projectedCatEnd = Math.round((catTotal / currentDay) * totalDaysInMonth);
      const projectedOver = projectedCatEnd - limit;
      const dailyCut = Math.round(projectedOver / daysRemaining);

      insights.push({
        id: `ins-limit-${catId}`,
        title: `Vượt hạn mức ngân sách ${catName}`,
        message: `Bạn đang chi ${formatVND(catTotal)}, đã vượt ${pctOver}% (${formatVND(excess)}) so với hạn mức ${formatVND(limit)}.`,
        severity: 'critical',
        metricLabel: 'Đã chi / Hạn mức',
        metricValue: `${formatVND(catTotal)} / ${formatVND(limit)}`,
        category: catName,
        observation: `Hạng mục ${catName} đã tiêu ${formatVND(catTotal)}, vượt ngân sách ${pctOver}%.`,
        projection: `Nếu giữ tốc độ này, cuối tháng bạn sẽ vượt ngân sách khoảng ${formatVND(projectedOver)}.`,
        suggestedAction: `Cắt giảm khoảng ${formatVND(Math.max(10000, dailyCut))} mỗi ngày cho ${catName} trong ${daysRemaining} ngày tới để đưa ngân sách về trạng thái an toàn.`,
        dailyImpact: `Cắt giảm ${formatVND(Math.max(10000, dailyCut))}/ngày`,
        targetTab: 'expenses',
        actionableStep: `Ngừng phát sinh giao dịch nhóm ${catName} trong những ngày còn lại của tháng.`,
      });
    } else if (limit > 0 && catTotal >= limit * 0.8) {
      const remainingLimit = limit - catTotal;
      const safeDailySpend = Math.round(remainingLimit / daysRemaining);
      insights.push({
        id: `ins-near-limit-${catId}`,
        title: `Cảnh báo chạm trần ${catName}`,
        message: `Đã sử dụng ${Math.round((catTotal / limit) * 100)}% hạn mức (${formatVND(catTotal)} / ${formatVND(limit)}).`,
        severity: 'warning',
        metricLabel: 'Còn lại cho tháng',
        metricValue: formatVND(remainingLimit),
        category: catName,
        observation: `Bạn đã dùng gần hết hạn mức ${catName} khi tháng vẫn còn ${daysRemaining} ngày.`,
        projection: `Nếu chi tiêu trên ${formatVND(safeDailySpend)}/ngày, bạn sẽ chính thức vỡ ngân sách ${catName}.`,
        suggestedAction: `Giới hạn chi tiêu ${catName} tối đa ${formatVND(safeDailySpend)}/ngày trong ${daysRemaining} ngày còn lại.`,
        dailyImpact: `Tối đa ${formatVND(safeDailySpend)}/ngày`,
        targetTab: 'budget',
        actionableStep: `Giới hạn chi tiêu ${catName} tối đa ${formatVND(safeDailySpend)}/ngày.`,
      });
    }
  });

  // Check Month-over-Month spikes
  Object.entries(currentCatTotals).forEach(([catId, currentAmt]) => {
    const prevAmt = prevCatTotals[catId] || 0;
    const catObj = CATEGORIES.find((c) => c.id === catId);
    const catName = catObj?.name || catId;

    if (prevAmt >= 300000 && currentAmt > prevAmt) {
      const diffPct = Math.round(((currentAmt - prevAmt) / prevAmt) * 100);
      if (diffPct >= 20 && !categoryLimits[catId]) {
        const diffAmt = currentAmt - prevAmt;
        const dailyDiff = Math.round(diffAmt / currentDay);
        insights.push({
          id: `ins-mom-${catId}`,
          title: `${catName} tăng mạnh ${diffPct}% so với tháng trước`,
          message: `Chi tiêu ${catName} tăng ${diffPct}% (+${formatVND(diffAmt)}) so với cùng kỳ tháng trước.`,
          severity: 'warning',
          metricLabel: 'Mức tăng MoM',
          metricValue: `+${diffPct}%`,
          category: catName,
          observation: `Chi tiêu ${catName} hiện đạt ${formatVND(currentAmt)} (tháng trước là ${formatVND(prevAmt)}).`,
          projection: `Nếu duy trì đà tăng này, chi phí ${catName} cả năm sẽ tăng thêm khoảng ${formatVND(diffAmt * 12)}.`,
          suggestedAction: `Rà soát các hóa đơn gần đây của ${catName} và thiết lập hạn mức tháng để chặn đà tăng tự phát.`,
          dailyImpact: `Tăng trung bình +${formatVND(dailyDiff)}/ngày`,
          targetTab: 'budget',
          actionableStep: 'Thiết lập hạn mức ngân sách và kiểm tra lại lịch sử chi tiêu nhóm này.',
        });
      }
    }
  });

  // 3. Subscriptions & Recurring Bills Optimization
  const totalRecurring = recurringExpenses.reduce((acc, r) => acc + r.amount, 0);
  if (income > 0 && totalRecurring > 0) {
    const recIncomePct = Math.round((totalRecurring / income) * 100);
    if (recIncomePct > 20) {
      insights.push({
        id: 'ins-recurring-high',
        title: 'Tỷ trọng chi phí cố định đang cao (> 20%)',
        message: `Hóa đơn & đăng ký định kỳ ngốn ${recIncomePct}% thu nhập (${formatVND(totalRecurring)}/tháng).`,
        severity: 'warning',
        metricLabel: 'Chi phí định kỳ',
        metricValue: `${formatVND(totalRecurring)}/tháng`,
        observation: `Bạn có ${recurringExpenses.length} khoản chi định kỳ chiếm ${recIncomePct}% ngân sách cố định mỗi tháng.`,
        projection: `Chi phí cố định quá cao sẽ thu hẹp biên độ ứng phó với các tình huống rủi ro khẩn cấp.`,
        suggestedAction: `Rà soát danh sách định kỳ, hủy các gói đăng ký ít sử dụng hoặc đàm phán lại các gói dịch vụ viễn thông/phí thường niên.`,
        dailyImpact: `Tiêu tốn ${formatVND(Math.round(totalRecurring / 30))}/ngày cố định`,
        targetTab: 'budget',
        actionableStep: 'Rà soát hủy các dịch vụ đăng ký ít sử dụng.',
      });
    }
  }

  // 4. Goals Optimization
  goals.forEach((goal) => {
    const remaining = goal.target - goal.current;
    if (remaining > 0) {
      const pct = Math.round((goal.current / goal.target) * 100);
      const monthlySavingsGoal = Math.ceil(remaining / 6);
      const dailySavingForGoal = Math.ceil(monthlySavingsGoal / 30);
      insights.push({
        id: `ins-goal-${goal.id}`,
        title: `Kế hoạch cán đích mục tiêu "${goal.name}"`,
        message: `Đã hoàn thành ${pct}%, còn thiếu ${formatVND(remaining)}.`,
        severity: 'recommendation',
        metricLabel: 'Tiến độ hoàn thành',
        metricValue: `${pct}%`,
        observation: `Mục tiêu "${goal.name}" đã tích lũy được ${formatVND(goal.current)} / ${formatVND(goal.target)}.`,
        projection: `Chỉ cần tích lũy đều đặn ${formatVND(monthlySavingsGoal)}/tháng, bạn sẽ hoàn thành mục tiêu trong 6 tháng tới.`,
        suggestedAction: `Tự động trích ${formatVND(dailySavingForGoal)}/ngày (hoặc trích ${formatVND(monthlySavingsGoal)} ngay khi nhận lương) vào mục tiêu này.`,
        dailyImpact: `Cần ${formatVND(dailySavingForGoal)}/ngày`,
        targetTab: 'goals',
        actionableStep: 'Tự động trích lập khoản này vào đầu tháng.',
      });
    }
  });

  return insights;
}
