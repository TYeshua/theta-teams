export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export interface CalendarDay {
  day: number | null;
  dateStr: string | null;
}

export function generateCalendarGrid(year: number, month: number): CalendarDay[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday
  
  const grid: CalendarDay[] = [];
  
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    grid.push({ day: null, dateStr: null });
  }
  
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const padMonth = String(month + 1).padStart(2, '0');
    const padDay = String(i).padStart(2, '0');
    grid.push({
      day: i,
      dateStr: `${year}-${padMonth}-${padDay}`,
    });
  }
  
  // Empty slots for end of the week if needed
  while (grid.length % 7 !== 0) {
    grid.push({ day: null, dateStr: null });
  }
  
  return grid;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
