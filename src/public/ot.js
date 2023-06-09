// See:
// https://replit.com/@LuisAFK/OT-Catchup#ot.js
//

function simplifyOTs(ots, recurse = true) {
  // Remove unnecessary/empty skips/inserts
  const result1 = [];
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
  const result2 = [];
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

function flattenOTs(ots, file = '') {
  // TIDO: actually flatten instead of goofy negative skip workaround

  const result = [];

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

function applyOTs(file, ots, start = 0, err = true) {
  let cursor = start;

  ots = simplifyOTs(ots);

  for (let ot of ots) {
    // According to Turbio's crosis docs, the following is a valid OT:
    // { insert: 'hi' }

    if (ot.insert) {
      ot = {
        op: 'insert',
        chars: ot.insert,
      };
    } else if (ot.delete) {
      ot = {
        op: 'delete',
        count: ot.delete,
      };
    } else if (ot.skip) {
      ot = {
        op: 'skip',
        count: ot.skip,
      };
    }

    switch (ot.ot || ot.op) {
      case 'insert':
        file = file.substr(0, cursor) + ot.chars + file.substr(cursor);
        cursor += ot.chars.length;
        break;

      case 'delete':
        if (cursor + ot.count > file.length && err) {
          throw new Error("Can't delete past the end of a string");
        }
        file = file.substr(0, cursor) + file.substr(cursor + ot.count);
        break;

      case 'skip':
        cursor += ot.count;
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

function verifyOTs(stale, latest, ots, err = true) {
  try {
    return applyOTs(stale, ots, 0, err).file == latest;
  } catch {
    return false;
  }
}

function diffsToOTs(diffs) {
  const ots = [];

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
