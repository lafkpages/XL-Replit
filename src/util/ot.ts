// See:
// https://replit.com/@LuisAFK/OT-Catchup#ot.js
//

import type { OTv1, OT, Diff } from '../types';

export function simplifyOTs(ots: OTv1[], recurse = true) {
  // Remove unnecessary/empty skips/inserts
  const result1: OTv1[] = [];

  for (let i = 0; i < ots.length; i++) {
    const ot = ots[i];

    if (ot.skip == 0 || ot.insert?.length == 0) {
      continue;
    }

    if (i == ots.length - 1 && ot.skip) {
      continue;
    }

    result1.push(ot);
  }

  // Combine consecutive skips/inserts
  const result2: OTv1[] = [];
  for (let i = 0; i < result1.length; i++) {
    const ot = result1[i];
    const nextOt = result1[i + 1];

    if (nextOt) {
      if (ot.insert && nextOt.insert) {
        result2.push({
          insert: ot.insert + nextOt.insert,
        });
        continue;
      }

      if (ot.skip && nextOt.skip) {
        result2.push({
          skip: ot.skip + nextOt.skip,
        });
        continue;
      }
    }

    result2.push(ot);
  }

  // Recurse until fully clean
  let result3 = result2;
  if (recurse) {
    let previousLength = result3.length;
    while (true) {
      result3 = simplifyOTs(result3, false);

      if (result3.length == previousLength) {
        break;
      }

      previousLength = result3.length;
    }
  }

  return result3;
}

export function flattenOTs(ots: OTv1[][], file = '') {
  // TIDO: actually flatten instead of goofy negative skip workaround

  const result: OTv1[] = [];

  for (const otGroup of ots) {
    const { cursor, file: newFile } = applyOTs(file, otGroup);

    file = newFile;

    console.debug(file, otGroup, cursor);
    result.push(...otGroup);

    result.push({
      skip: -cursor,
    });
  }

  return simplifyOTs(result);
}

export function applyOTs(file: string, ots: OT[], start = 0, err = true) {
  let cursor = start;

  const _ots = simplifyOTs(otsV2ToV1(ots));

  for (let ot of _ots) {
    if (ot.insert) {
      file = file.substring(0, cursor) + ot.insert + file.substring(cursor);
      cursor += ot.insert.length;
    } else if (ot.delete) {
      if (cursor + ot.delete > file.length && err) {
        throw new Error("Can't delete past the end of a string");
      }
      file = file.substring(0, cursor) + file.substr(cursor + ot.delete);
    } else if (ot.skip) {
      cursor += ot.skip;
      if (cursor > file.length && err) {
        throw new Error("Can't skip past the end of a string");
      }
    }
  }

  return {
    file,
    cursor,
  };
}

export function verifyOTs(
  stale: string,
  latest: string,
  ots: OT[],
  err = true
) {
  try {
    return applyOTs(stale, ots, 0, err).file == latest;
  } catch {
    return false;
  }
}

export function diffsToOTs(diffs: Diff[]) {
  const ots: OTv1[] = [];

  for (const diff of diffs) {
    if (diff.added) {
      ots.push({
        insert: diff.value,
      });
    } else if (diff.removed) {
      ots.push({
        delete: diff.count,
      });
    } else {
      ots.push({
        skip: diff.count,
      });
    }
  }

  return simplifyOTs(ots);
}

export function otV2ToV1(ot: OT) {
  if ('op' in ot) {
    switch (ot.op) {
      case 'insert':
        return {
          insert: ot.value,
        };

      case 'delete':
        return {
          delete: ot.count,
        };

      case 'skip':
        return {
          skip: ot.count,
        };
    }
  }

  return ot;
}

export function otsV2ToV1(ots: OT[]) {
  return ots.map(otV2ToV1);
}
