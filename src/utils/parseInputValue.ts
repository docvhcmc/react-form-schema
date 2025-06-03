export function parseInputValue(event: React.ChangeEvent<any>): any {
  const target = event.target as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
  const { tagName } = target;

  switch (tagName) {
    case 'INPUT': {
      const input = target as HTMLInputElement;

      switch (input.type) {
        case 'number':
          return input.value === '' ? null : Number(input.value);
        case 'checkbox':
          return input.checked;
        case 'radio':
          return input.value;
        case 'file':
          return input.files;
        case 'date':
        case 'datetime-local':
        case 'month':
        case 'time':
        case 'week':
          return input.value ? new Date(input.value) : null;
        default:
          return input.value;
      }
    }

    case 'TEXTAREA': {
      return target.value;
    }

    case 'SELECT': {
      const select = target as HTMLSelectElement;
      return select.multiple
        ? Array.from(select.selectedOptions).map((opt) => opt.value)
        : select.value;
    }

    default:
      return (target as any).value;
  }
}
